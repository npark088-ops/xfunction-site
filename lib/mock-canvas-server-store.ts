// FAKE STAND-IN ONLY
// ---------------------------------------------------------------------
// This file plays the role of Canvas's own backend — the part that, in
// a real integration, would run entirely on instructure.com and that we
// would never write ourselves. It exists purely so the OAuth flow can
// be built and demoed without real Canvas Developer Key credentials.
// Delete it (along with app/login/oauth2/*) once CANVAS_BASE_URL points
// at a real Canvas instance — nothing on the "our app" side depends on
// it directly, only on the HTTP responses it produces.

interface PendingAuthorization {
  clientId: string;
  redirectUri: string;
  createdAt: number;
}

declare global {
  var __mockCanvasPendingCodes: Map<string, PendingAuthorization> | undefined;
}

// Anchored to globalThis (not just a module-level `const`) because
// Next.js dev mode can re-evaluate route handler modules independently
// on Fast Refresh, which would otherwise silently reset this Map
// between the /login/oauth2/auth and /login/oauth2/token files.
const pendingCodes = globalThis.__mockCanvasPendingCodes ?? new Map<string, PendingAuthorization>();
globalThis.__mockCanvasPendingCodes = pendingCodes;

const CODE_TTL_MS = 5 * 60 * 1000;

export function issueAuthorizationCode(clientId: string, redirectUri: string): string {
  const code = `mock_code_${crypto.randomUUID()}`;
  pendingCodes.set(code, { clientId, redirectUri, createdAt: Date.now() });
  return code;
}

// Single-use, like real Canvas authorization codes: consuming a code
// deletes it, so it can't be replayed.
export function consumeAuthorizationCode(
  code: string,
  clientId: string,
  redirectUri: string
): boolean {
  const entry = pendingCodes.get(code);
  pendingCodes.delete(code);

  if (!entry) return false;
  if (Date.now() - entry.createdAt > CODE_TTL_MS) return false;
  if (entry.clientId !== clientId || entry.redirectUri !== redirectUri) return false;

  return true;
}
