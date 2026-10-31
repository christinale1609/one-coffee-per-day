export const APP_NAME = "One Coffee Per Day!";
export const APP_TAGLINE =
  "Find the right people, send the right note, and walk into every coffee chat prepared.";

// LinkedIn connection-request note limits (characters).
export const CONNECT_NOTE_LIMIT = { free: 200, premium: 300 } as const;
// Messages sent after you're connected have no tight limit, but short gets replies.
export const FOLLOW_UP_LIMIT = 500;
export const THANK_YOU_LIMIT = 500;

// Per-user daily caps on AI calls, so a public demo can't run up the API bill.
export const DAILY_AI_LIMITS = {
  resume_parsed: 10,
  suggestions_generated: 8,
  message_generated: 40,
  prep_generated: 15,
} as const;

export const SUGGESTIONS_PER_BATCH = 6;

export const CONTACT_STATUSES = [
  { value: "to_reach_out", label: "To reach out", tone: "neutral" },
  { value: "reached_out", label: "Reached out", tone: "info" },
  { value: "accepted", label: "Chat accepted", tone: "accent" },
  { value: "completed", label: "Chat done", tone: "success" },
  { value: "no_response", label: "No response", tone: "muted" },
  { value: "declined", label: "Not now", tone: "muted" },
] as const;

export type ContactStatus = (typeof CONTACT_STATUSES)[number]["value"];

export const PIPELINE: ContactStatus[] = ["to_reach_out", "reached_out", "accepted", "completed"];
export const CLOSED: ContactStatus[] = ["no_response", "declined"];

export function statusLabel(status: string) {
  return CONTACT_STATUSES.find((s) => s.value === status)?.label ?? status;
}

export const CURRENT_STATUS_OPTIONS = [
  { value: "student", label: "Student" },
  { value: "new_grad", label: "Recent graduate" },
  { value: "early_career", label: "Early career (0-3 yrs)" },
  { value: "experienced", label: "Experienced (3+ yrs)" },
  { value: "career_switcher", label: "Switching careers" },
] as const;

export const CHAT_GOAL_OPTIONS = [
  "Learn what the role is really like",
  "Industry insights",
  "Advice on breaking in",
  "Referral or recruiting tips",
  "Long-term mentorship",
] as const;

export const INDUSTRY_IDEAS = [
  "Banking & Finance",
  "Consulting",
  "Tech",
  "Healthcare",
  "Energy",
  "Retail & CPG",
  "Public sector",
  "Startups",
] as const;

export const LINKEDIN_SEARCH_URL = "https://www.linkedin.com/search/results/people/?keywords=";
