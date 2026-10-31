import { NextResponse } from "next/server";
import { searchThenSubmit } from "@/lib/ai/claude";
import { DISCOVER_SYSTEM, discoverPrompt } from "@/lib/ai/prompts";
import { DiscoverSchema } from "@/lib/ai/schemas";
import { assertWithinDailyLimit, errorResponse, logEvent } from "@/lib/api";
import { SUGGESTIONS_PER_BATCH } from "@/lib/constants";
import { HttpError } from "@/lib/errors";
import { canonicalLinkedinUrl, linkedinSlug } from "@/lib/linkedin";
import { requireUser } from "@/lib/supabase/server";
import type { Profile, Suggestion } from "@/lib/types";

export const maxDuration = 300;

export async function POST() {
  try {
    const { supabase, user } = await requireUser();
    await assertWithinDailyLimit(supabase, user.id, "suggestions_generated");

    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>();
    if (!profile?.onboarded) throw new HttpError("Finish setting up your profile first.", 400);

    const [previous, contacts] = await Promise.all([
      supabase.from("suggestions").select("full_name, linkedin_url").order("created_at", { ascending: false }),
      supabase.from("contacts").select("full_name, linkedin_url"),
    ]);
    const known = [...(contacts.data ?? []), ...(previous.data ?? [])];
    const knownSlugs = new Set(known.map((k) => linkedinSlug(k.linkedin_url)).filter(Boolean));

    const { data, seenUrls } = await searchThenSubmit({
      schema: DiscoverSchema,
      system: DISCOVER_SYSTEM,
      prompt: discoverPrompt(
        profile,
        SUGGESTIONS_PER_BATCH,
        known.slice(0, 80).map((k) => k.full_name),
      ),
      submitTool: { name: "submit_people", description: "Submit the people you chose and the search ideas." },
      webSearch: { maxUses: 6, allowedDomains: ["linkedin.com"] },
      effort: "medium",
    });

    // Keep only people whose profile URL really came back from a search: no invented profiles.
    const seenSlugs = new Set(seenUrls.map(linkedinSlug).filter(Boolean));
    const batchId = crypto.randomUUID();
    const used = new Set<string>();
    const rows = [];
    for (const person of data.people) {
      const slug = linkedinSlug(person.linkedin_url);
      if (!slug || !seenSlugs.has(slug) || knownSlugs.has(slug) || used.has(slug)) continue;
      used.add(slug);
      rows.push({
        user_id: user.id,
        batch_id: batchId,
        full_name: person.full_name.trim(),
        headline: person.headline.trim(),
        company: person.company.trim(),
        location: person.location.trim(),
        linkedin_url: canonicalLinkedinUrl(person.linkedin_url)!,
        why: person.why.trim(),
        shared_ground: person.shared_ground.slice(0, 4),
        conversation_hook: person.conversation_hook.trim(),
        match_score: Math.max(0, Math.min(100, Math.round(person.match_score))),
      });
    }

    let suggestions: Suggestion[] = [];
    if (rows.length > 0) {
      const { data: saved, error } = await supabase
        .from("suggestions")
        .upsert(rows, { onConflict: "user_id,linkedin_url", ignoreDuplicates: true })
        .select("*");
      if (error) throw new HttpError("Couldn't save the suggestions. Please try again.", 500);
      suggestions = (saved as Suggestion[]).sort((a, b) => b.match_score - a.match_score);
    }

    await logEvent(supabase, user.id, "suggestions_generated", {
      returned: data.people.length,
      kept: suggestions.length,
    });
    return NextResponse.json({ suggestions, searchIdeas: data.search_ideas.slice(0, 3) });
  } catch (error) {
    return errorResponse(error);
  }
}
