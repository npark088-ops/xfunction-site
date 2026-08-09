// FAKE STAND-IN ONLY
// ---------------------------------------------------------------------
// Plays the role of Blackboard Learn's own backend — the part that, in
// a real integration, would run entirely on the school's Learn instance
// and that we would never write ourselves. Exists purely so the OAuth
// flow can be built and demoed without a real Blackboard REST API
// integration. Delete it (along with app/learn/api/public/v1/oauth2/*
// and app/learn/api/public/v1/users) once BLACKBOARD_BASE_URL points at
// a real Learn domain — nothing on the "our app" side depends on it
// directly, only on the HTTP responses it produces. Same pattern as
// lib/mock-canvas-server-store.ts.

interface PendingAuthorization {
  clientId: string;
  redirectUri: string;
  createdAt: number;
}

declare global {
  var __mockBlackboardPendingCodes: Map<string, PendingAuthorization> | undefined;
}

const pendingCodes =
  globalThis.__mockBlackboardPendingCodes ?? new Map<string, PendingAuthorization>();
globalThis.__mockBlackboardPendingCodes = pendingCodes;

const CODE_TTL_MS = 5 * 60 * 1000;

export function issueAuthorizationCode(clientId: string, redirectUri: string): string {
  const code = `mock_blackboard_code_${crypto.randomUUID()}`;
  pendingCodes.set(code, { clientId, redirectUri, createdAt: Date.now() });
  return code;
}

// Single-use, like real Blackboard authorization codes: consuming a
// code deletes it, so it can't be replayed.
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
