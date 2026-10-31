/** The profile slug from any linkedin.com/in/... URL (country subdomains, query strings and all). */
export function linkedinSlug(url: string): string | null {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    if (!/(^|\.)linkedin\.com$/i.test(parsed.hostname)) return null;
    const match = parsed.pathname.match(/^\/in\/([^/]+)/i);
    return match ? decodeURIComponent(match[1]).toLowerCase() : null;
  } catch {
    return null;
  }
}

export function canonicalLinkedinUrl(url: string): string | null {
  const slug = linkedinSlug(url);
  return slug ? `https://www.linkedin.com/in/${encodeURIComponent(slug)}` : null;
}

/** Comparable form of any URL: no protocol, www, query, hash or trailing slash. */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname.replace(/^www\./, "")}${parsed.pathname.replace(/\/+$/, "")}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}
