import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { searchThenSubmit } from "@/lib/ai/claude";
import { PREP_SYSTEM, prepPrompt } from "@/lib/ai/prompts";
import { BriefSchema } from "@/lib/ai/schemas";
import { assertWithinDailyLimit, errorResponse, logEvent } from "@/lib/api";
import { HttpError } from "@/lib/errors";
import { normalizeUrl } from "@/lib/linkedin";
import { requireUser } from "@/lib/supabase/server";
import type { Contact, Profile, ResearchBrief } from "@/lib/types";

export const maxDuration = 300;

const Body = z.object({ contactId: z.string().uuid() });

export async function POST(request: NextRequest) {
  try {
    const parsedBody = Body.safeParse(await request.json().catch(() => null));
    if (!parsedBody.success) throw new HttpError("Invalid request.", 400);

    const { supabase, user } = await requireUser();
    await assertWithinDailyLimit(supabase, user.id, "prep_generated");

    const [{ data: profile }, { data: contact }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single<Profile>(),
      supabase.from("contacts").select("*").eq("id", parsedBody.data.contactId).single<Contact>(),
    ]);
    if (!profile || !contact) throw new HttpError("Contact not found.", 404);

    const { data, seenUrls } = await searchThenSubmit({
      schema: BriefSchema,
      system: PREP_SYSTEM,
      prompt: prepPrompt(profile, contact),
      submitTool: { name: "submit_brief", description: "Submit the coffee-chat brief." },
      webSearch: { maxUses: 5 },
      effort: "medium",
    });

    // Only link to pages the search actually returned.
    const seen = new Set(seenUrls.map(normalizeUrl));
    const isSeen = (url: string) => seen.has(normalizeUrl(url));
    const sourceKeys = new Set<string>();
    const research: ResearchBrief = {
      ...data,
      recent_activity: data.recent_activity.map((a) => ({ ...a, url: isSeen(a.url) ? a.url : "" })),
      sources: data.sources.filter((s) => {
        const key = normalizeUrl(s.url);
        if (!isSeen(s.url) || sourceKeys.has(key)) return false;
        sourceKeys.add(key);
        return true;
      }),
      generated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("contacts").update({ research }).eq("id", contact.id);
    if (error) throw new HttpError("Couldn't save the brief. Please try again.", 500);

    await logEvent(supabase, user.id, "prep_generated", { sources: research.sources.length });
    return NextResponse.json({ research });
  } catch (error) {
    return errorResponse(error);
  }
}
