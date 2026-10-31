import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DAILY_AI_LIMITS } from "./constants";
import { HttpError } from "./errors";

export function errorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}

type LimitedEvent = keyof typeof DAILY_AI_LIMITS;

/** Caps AI calls per user per 24 hours, counted from the events table. */
export async function assertWithinDailyLimit(supabase: SupabaseClient, userId: string, event: LimitedEvent) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("name", event)
    .gte("created_at", since);
  if (error) throw new HttpError("Couldn't check your usage. Is the database set up?", 500);
  if ((count ?? 0) >= DAILY_AI_LIMITS[event]) {
    throw new HttpError("You've hit today's limit for this feature. It resets in 24 hours.", 429);
  }
}

export async function logEvent(
  supabase: SupabaseClient,
  userId: string,
  name: string,
  props: Record<string, unknown> = {},
) {
  const { error } = await supabase.from("events").insert({ user_id: userId, name, props });
  if (error) console.error("event log failed", name, error.message);
}
