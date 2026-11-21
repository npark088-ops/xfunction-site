import { createHash, randomBytes } from "node:crypto";

// Parent invite codes. SERVER ONLY (it uses Node's crypto): the browser never
// makes, hashes or stores a code. Only a hash goes in the database
// (supabase/pending/0029_parent_hardening.sql); the code itself is shown to the
// student once, when it is created.

// 24 random bytes = 192 bits (the requirement is at least 128), written as 32
// URL-safe characters so it fits in a link.
const CODE_BYTES = 24;
export const INVITE_CODE_LENGTH = 32;
const CODE_PATTERN = /^[A-Za-z0-9_-]{32}$/;

// Wrong-code allowance per signed-in user (enforced inside the database
// functions, which take these numbers; see lib/parent-server.ts).
export const INVITE_MAX_FAILURES = 5;
export const INVITE_FAILURE_WINDOW_MINUTES = 60;

// How long a pending invite lasts (the database enforces it; this is for display).
export const INVITE_TTL_DAYS = 7;

export function generateInviteCode(): string {
  return randomBytes(CODE_BYTES).toString("base64url");
}

// What gets stored and compared: SHA-256 of the code, as 64 lowercase hex characters.
export function hashInviteCode(code: string): string {
  return createHash("sha256").update(code, "utf8").digest("hex");
}

// Accepts exactly what generateInviteCode makes (after trimming spaces from
// copy and paste). Anything else is rejected before the database is asked, so
// it can't be used to probe the system and costs nothing.
export function normalizeInviteCode(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const code = input.trim();
  return CODE_PATTERN.test(code) ? code : null;
}

// "jane.doe@gmail.com" -> "j***@gmail.com". Shown to a parent before they
// accept, so the full address of the student never reaches their browser.
export function maskEmail(email: unknown): string {
  if (typeof email !== "string") return "***";
  const at = email.lastIndexOf("@");
  if (at < 1 || at === email.length - 1) return "***";
  const first = Array.from(email.slice(0, at))[0] ?? "";
  return `${first}***${email.slice(at)}`;
}

export function inviteLink(origin: string, code: string): string {
  return `${origin}/parent/join?code=${encodeURIComponent(code)}`;
}
