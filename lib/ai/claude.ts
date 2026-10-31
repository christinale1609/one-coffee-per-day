import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { HttpError } from "@/lib/errors";

export const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

type Effort = "low" | "medium" | "high";

let client: Anthropic | undefined;

function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new HttpError("The server is missing ANTHROPIC_API_KEY. Add it to your environment variables.", 500);
  }
  client ??= new Anthropic();
  return client;
}

// If a safety classifier declines a request, let the API retry it on Anthropic's
// recommended fallback model instead of failing. Haiku has no server-side fallback.
function fallbackOptions(): { betas: Anthropic.Beta.AnthropicBeta[]; fallbacks?: "default" } {
  if (MODEL.startsWith("claude-haiku")) return { betas: [] };
  return { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" };
}

function toHttpError(error: unknown): HttpError {
  if (error instanceof HttpError) return error;
  if (error instanceof Anthropic.AuthenticationError) {
    return new HttpError("The server's Anthropic API key was rejected. Check ANTHROPIC_API_KEY.", 500);
  }
  if (error instanceof Anthropic.RateLimitError) {
    return new HttpError("The AI is busy right now. Wait a minute and try again.", 429);
  }
  if (error instanceof Anthropic.BadRequestError) {
    return new HttpError(`The AI request was rejected: ${error.message}`, 502);
  }
  if (error instanceof Anthropic.APIError) {
    return new HttpError("The AI service had a problem. Please try again.", 502);
  }
  console.error(error);
  return new HttpError("Something went wrong talking to the AI. Please try again.", 500);
}

/** One Claude call whose answer is validated against a Zod schema. */
export async function generateObject<S extends z.ZodType>(opts: {
  schema: S;
  system: string;
  content: string | Anthropic.Beta.BetaContentBlockParam[];
  effort?: Effort;
}): Promise<z.infer<S>> {
  try {
    const response = await getClient().beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      system: opts.system,
      messages: [{ role: "user", content: opts.content }],
      output_config: { effort: opts.effort ?? "low", format: betaZodOutputFormat(opts.schema) },
      ...fallbackOptions(),
    });
    if (response.stop_reason === "refusal") {
      throw new HttpError("The AI declined this request. Try rewording it.", 422);
    }
    if (!response.parsed_output) {
      throw new HttpError("The AI returned an incomplete answer. Please try again.", 502);
    }
    return response.parsed_output as z.infer<S>;
  } catch (error) {
    throw toHttpError(error);
  }
}

/**
 * Lets Claude search the web, then hand back its findings by calling a "submit" tool
 * whose input must match `schema`. Also returns every URL the searches actually returned,
 * so callers can drop anything the model didn't really see.
 */
export async function searchThenSubmit<S extends z.ZodType>(opts: {
  schema: S;
  system: string;
  prompt: string;
  submitTool: { name: string; description: string };
  webSearch: { maxUses: number; allowedDomains?: string[] };
  effort?: Effort;
}): Promise<{ data: z.infer<S>; seenUrls: string[] }> {
  const tools: Anthropic.Beta.BetaToolUnion[] = [
    {
      // The basic variant returns every result as a web_search_tool_result block,
      // which is what lets us verify URLs below.
      type: "web_search_20250305",
      name: "web_search",
      max_uses: opts.webSearch.maxUses,
      ...(opts.webSearch.allowedDomains ? { allowed_domains: opts.webSearch.allowedDomains } : {}),
    },
    {
      name: opts.submitTool.name,
      description: opts.submitTool.description,
      input_schema: toStrictJsonSchema(opts.schema) as Anthropic.Beta.BetaTool.InputSchema,
      strict: true,
    },
  ];
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: opts.prompt }];
  const seenUrls: string[] = [];

  try {
    for (let turn = 0; turn < 5; turn++) {
      const response = await getClient().beta.messages.create({
        model: MODEL,
        max_tokens: 16000,
        system: opts.system,
        tools,
        tool_choice: { type: "auto" },
        messages,
        output_config: { effort: opts.effort ?? "medium" },
        ...fallbackOptions(),
      });

      for (const block of response.content) {
        if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
          for (const result of block.content) seenUrls.push(result.url);
        }
      }
      if (response.stop_reason === "refusal") {
        throw new HttpError("The AI declined this request. Try adjusting your goals.", 422);
      }

      const call = response.content.find(
        (b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use" && b.name === opts.submitTool.name,
      );
      if (call) {
        const parsed = opts.schema.safeParse(call.input);
        if (!parsed.success) throw new HttpError("The AI returned results in an unexpected shape. Try again.", 502);
        return { data: parsed.data as z.infer<S>, seenUrls };
      }

      messages.push({ role: "assistant", content: response.content });
      // pause_turn: the server-side search loop needs another request to continue.
      if (response.stop_reason !== "pause_turn") {
        messages.push({ role: "user", content: `Call ${opts.submitTool.name} now with what you found.` });
      }
    }
    throw new HttpError("The AI took too long to finish searching. Please try again.", 504);
  } catch (error) {
    throw toHttpError(error);
  }
}

// Strict tool schemas need additionalProperties: false, every key required,
// and no numeric/length bounds (Zod adds integer bounds by default).
const UNSUPPORTED_KEYS = [
  "$schema",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "minLength",
  "maxLength",
  "minItems",
  "maxItems",
];

function toStrictJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const strictify = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(strictify);
    if (!node || typeof node !== "object") return node;
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node)) {
      if (!UNSUPPORTED_KEYS.includes(key)) out[key] = strictify(value);
    }
    if (out.type === "object" && out.properties && typeof out.properties === "object") {
      out.additionalProperties = false;
      out.required = Object.keys(out.properties);
    }
    return out;
  };
  return strictify(z.toJSONSchema(schema)) as Record<string, unknown>;
}
