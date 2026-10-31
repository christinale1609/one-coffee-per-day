import type Anthropic from "@anthropic-ai/sdk";
import mammoth from "mammoth";
import { NextResponse, type NextRequest } from "next/server";
import { generateObject } from "@/lib/ai/claude";
import { RESUME_SYSTEM } from "@/lib/ai/prompts";
import { ResumeSchema } from "@/lib/ai/schemas";
import { assertWithinDailyLimit, errorResponse, logEvent } from "@/lib/api";
import { HttpError } from "@/lib/errors";
import { requireUser } from "@/lib/supabase/server";

export const maxDuration = 120;

// Vercel caps request bodies at 4.5 MB.
const MAX_BYTES = 4 * 1024 * 1024;
const INSTRUCTION = "Extract this resume into the profile fields.";

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireUser();
    await assertWithinDailyLimit(supabase, user.id, "resume_parsed");

    const form = await request.formData();
    const file = form.get("file");
    const pasted = form.get("text");
    let content: Anthropic.Beta.BetaContentBlockParam[];
    let source: string;

    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_BYTES) throw new HttpError("That file is over 4 MB. Try a smaller PDF.", 413);
      const buffer = Buffer.from(await file.arrayBuffer());
      const name = file.name.toLowerCase();
      if (file.type === "application/pdf" || name.endsWith(".pdf")) {
        source = "pdf";
        content = [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: buffer.toString("base64") },
          },
          { type: "text", text: INSTRUCTION },
        ];
      } else if (name.endsWith(".docx")) {
        source = "docx";
        const { value } = await mammoth.extractRawText({ buffer });
        content = [{ type: "text", text: `<resume>\n${value}\n</resume>\n\n${INSTRUCTION}` }];
      } else if (name.endsWith(".txt") || file.type.startsWith("text/")) {
        source = "txt";
        content = [{ type: "text", text: `<resume>\n${buffer.toString("utf8")}\n</resume>\n\n${INSTRUCTION}` }];
      } else {
        throw new HttpError("Please upload a PDF, DOCX or TXT file.", 415);
      }
    } else if (typeof pasted === "string" && pasted.trim().length >= 50) {
      source = "pasted";
      content = [{ type: "text", text: `<resume>\n${pasted.slice(0, 30000)}\n</resume>\n\n${INSTRUCTION}` }];
    } else {
      throw new HttpError("Upload your resume, or paste at least a few lines of it.", 400);
    }

    const profile = await generateObject({ schema: ResumeSchema, system: RESUME_SYSTEM, content, effort: "low" });
    await logEvent(supabase, user.id, "resume_parsed", { source });
    return NextResponse.json({ profile });
  } catch (error) {
    return errorResponse(error);
  }
}
