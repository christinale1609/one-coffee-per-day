"use client";

import { createClient } from "./supabase/client";

/** Records a product-analytics event for the signed-in user. Never throws. */
export function track(name: string, props: Record<string, unknown> = {}) {
  const supabase = createClient();
  void supabase.auth.getUser().then(({ data }) => {
    if (!data.user) return;
    void supabase.from("events").insert({ user_id: data.user.id, name, props });
  });
}

/** POSTs JSON to one of our API routes; throws an Error with the server's message on failure. */
export async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as T;
}

export function daysSince(iso: string | null) {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

export function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] ?? "";
}
