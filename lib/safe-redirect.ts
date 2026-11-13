// Post-login redirects carry a `next` value that comes from the URL
// (?next=...), which anyone can craft — so it must never be trusted as-is.
// Used to be: `window.location.href = next` and `${origin}${next}`, which
// let `?next=https://evil.example`, `?next=//evil.example` or
// `?next=@evil.example` bounce a freshly signed-in user to another site.
//
// Only same-site relative paths are accepted: a single leading "/" (not
// "//", not "/\"), no backslashes, no control characters (browsers strip
// tabs/newlines, so "/\t/evil.example" would otherwise become
// "//evil.example"). The query string is allowed — it's how a logged-out
// parent keeps /parent/join?code=... through login and signup.
export function safeNextPath(raw: string | null | undefined, fallback: string): string {
  if (!raw) return fallback;
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//")) return fallback;
  if (/[\u0000-\u001f\u007f\\]/.test(raw)) return fallback;
  return raw;
}
