import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { generateObject } from "@/lib/ai/claude";
import { MESSAGES_SYSTEM, messagesPrompt } from "@/lib/ai/prompts";
import { MessagesSchema } from "@/lib/ai/schemas";
import { assertWithinDailyLimit, errorResponse, logEvent } from "@/lib/api";
import { messageLimit } from "@/lib/messages";
import { HttpError } from "@/lib/errors";
import { requireUser } from "@/lib/supabase/server";
import type { Contact, MessageVariant, Profile } from "@/lib/types";

export const maxDuration = 120;

const Body = z.object({
  contactId: z.string().uuid(),
  kind: z.enum(["connect", "follow_up", "thank_you"]),
  tone: z.enum(["warm", "concise", "professional"]).default("warm"),
});

export async function POST(request: NextRequest) {
  try {
    const parsedBody = Body.safeParse(await request.json().catch(() => null));
    if (!parsedBody.success) throw new HttpError("Invalid request.", 400);
    const { contactId, kind, tone } = parsedBody.data;

    const { supabase, user } = await requireUser();
    await assertWithinDailyLimit(supabase, user.id, "message_generated");

    const [{ data: profile }, { data: contact }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single<Profile>(),
      supabase.from("contacts").select("*").eq("id", contactId).single<Contact>(),
    ]);
    if (!profile || !contact) throw new HttpError("Contact not found.", 404);

    const limit = messageLimit(kind, profile.linkedin_premium);
    let variants: MessageVariant[] = [];
    let tooLong: number[] = [];
    // LinkedIn truncates notes over the limit, so enforce it here and retry once if needed.
    for (let attempt = 0; attempt < 2 && variants.length === 0; attempt++) {
      const out = await generateObject({
        schema: MessagesSchema,
        system: MESSAGES_SYSTEM,
        content: messagesPrompt({ profile, contact, kind, tone, limit, tooLong }),
        effort: "medium",
      });
      const drafts = out.variants.map((v) => ({ angle: v.angle.trim(), text: v.text.trim() }));
      variants = drafts.filter((v) => v.text.length > 0 && v.text.length <= limit);
      tooLong = drafts.map((v) => v.text.length);
    }
    if (variants.length === 0) {
      throw new HttpError("Couldn't fit a message under the limit. Try the Concise tone.", 502);
    }

    await logEvent(supabase, user.id, "message_generated", { kind, tone, variants: variants.length });
    return NextResponse.json({ variants, limit });
  } catch (error) {
    return errorResponse(error);
  }
}
