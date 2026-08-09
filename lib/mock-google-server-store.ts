// FAKE STAND-IN ONLY
// ---------------------------------------------------------------------
// Plays the role of Google's own backend — the part that, in a real
// integration, would run entirely on Google's servers and that we would
// never write ourselves. Exists purely so the OAuth flow can be built
// and demoed without a real Google OAuth client. Delete it (along with
// app/o/oauth2/v2/auth and app/token) once GOOGLE_OAUTH_AUTH_BASE_URL /
// GOOGLE_OAUTH_TOKEN_BASE_URL point at Google's real hosts — nothing on
// the "our app" side depends on it directly, only on the HTTP responses
// it produces. Same pattern as lib/mock-canvas-server-store.ts, kept in
// its own global/Map so the two mocks' authorization codes never collide.

interface PendingAuthorization {
  clientId: string;
  redirectUri: string;
  createdAt: number;
}

declare global {
  var __mockGoogleClassroomPendingCodes: Map<string, PendingAuthorization> | undefined;
}

const pendingCodes =
  globalThis.__mockGoogleClassroomPendingCodes ?? new Map<string, PendingAuthorization>();
globalThis.__mockGoogleClassroomPendingCodes = pendingCodes;

const CODE_TTL_MS = 5 * 60 * 1000;

export function issueAuthorizationCode(clientId: string, redirectUri: string): string {
  const code = `mock_google_code_${crypto.randomUUID()}`;
  pendingCodes.set(code, { clientId, redirectUri, createdAt: Date.now() });
  return code;
}

// Single-use, like real Google authorization codes: consuming a code
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
