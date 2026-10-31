"use client";

// Privacy mode shortens other people's names to "First L." on screen, for demos and
// screen sharing. Turn it on with ?privacy=on and off with ?privacy=off (any page).
const KEY = "ocpd-privacy";

export function privacyOn(): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(KEY) === "on";
  } catch {
    return false;
  }
}

export function applyPrivacyParam() {
  try {
    const value = new URLSearchParams(window.location.search).get("privacy");
    if (value === "on") window.localStorage.setItem(KEY, "on");
    if (value === "off") window.localStorage.removeItem(KEY);
  } catch {
    // Storage blocked: privacy mode just stays off.
  }
}

export function displayName(fullName: string): string {
  if (!privacyOn()) return fullName;
  const parts = fullName.trim().split(/\s+/);
  return parts.length < 2 ? fullName : `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Replaces a person's full name (and bare last name) inside free text, e.g. a research brief. */
export function maskName(text: string, fullName: string): string {
  if (!text || !privacyOn()) return text;
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return text;
  const last = parts[parts.length - 1];
  return text
    .replace(new RegExp(escape(fullName.trim()), "gi"), displayName(fullName))
    .replace(new RegExp(`\\b${escape(last)}\\b`, "g"), `${last[0]}.`);
}
