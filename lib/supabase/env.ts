// Accept the URL with or without the "/rest/v1/" suffix the Supabase dashboard sometimes shows.
export const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
// Supabase now calls this the "publishable" key; older projects call it the "anon" key.
export const SUPABASE_KEY = (
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  ""
).trim();

export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);
