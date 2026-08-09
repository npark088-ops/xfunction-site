// FAKE STAND-IN ONLY
// ---------------------------------------------------------------------
// Plays the role of Schoology's own backend — the part that, in a real
// integration, would run entirely on Schoology's servers and that we
// would never write ourselves. Exists purely so the three-legged OAuth1
// flow can be built and demoed without a real Schoology consumer
// key/secret. Delete it (along with app/v1/oauth/*, app/oauth/authorize,
// and app/v1/users/me) once SCHOOLOGY_API_BASE_URL / SCHOOLOGY_APP_BASE_URL
// point at Schoology's real hosts — nothing on the "our app" side depends
// on it directly, only on the HTTP responses it produces. Same pattern as
// lib/mock-canvas-server-store.ts.
//
// Unlike the OAuth2 mocks (Canvas, Google), this one has to track token
// SECRETS too — every step of a real OAuth1 flow is independently signed
// (see lib/oauth1-signing.ts), so both sides need the secret to verify.

interface PendingRequestToken {
  secret: string;
  callbackUrl: string;
  authorized: boolean;
  createdAt: number;
}

interface IssuedAccessToken {
  secret: string;
}

declare global {
  var __mockSchoologyRequestTokens: Map<string, PendingRequestToken> | undefined;
  var __mockSchoologyAccessTokens: Map<string, IssuedAccessToken> | undefined;
}

const requestTokens =
  globalThis.__mockSchoologyRequestTokens ?? new Map<string, PendingRequestToken>();
globalThis.__mockSchoologyRequestTokens = requestTokens;

const accessTokens = globalThis.__mockSchoologyAccessTokens ?? new Map<string, IssuedAccessToken>();
globalThis.__mockSchoologyAccessTokens = accessTokens;

const TOKEN_TTL_MS = 10 * 60 * 1000;

export function issueRequestToken(callbackUrl: string): { token: string; secret: string } {
  const token = `mock_schoology_rtoken_${crypto.randomUUID()}`;
  const secret = `mock_schoology_rsecret_${crypto.randomUUID()}`;
  requestTokens.set(token, { secret, callbackUrl, authorized: false, createdAt: Date.now() });
  return { token, secret };
}

export function getRequestTokenSecret(token: string): string | undefined {
  return requestTokens.get(token)?.secret;
}

// Simulates the user clicking "Allow" on Schoology's consent screen.
// Returns the callback URL to redirect back to, or null if the token is
// unknown/expired.
export function authorizeRequestToken(token: string): string | null {
  const entry = requestTokens.get(token);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > TOKEN_TTL_MS) {
    requestTokens.delete(token);
    return null;
  }
  entry.authorized = true;
  return entry.callbackUrl;
}

// Single-use, like a real Schoology request token: exchanging it for an
// access token deletes it, so it can't be replayed.
export function exchangeRequestTokenForAccessToken(
  requestToken: string
): { token: string; secret: string } | null {
  const entry = requestTokens.get(requestToken);
  requestTokens.delete(requestToken);

  if (!entry) return null;
  if (!entry.authorized) return null;
  if (Date.now() - entry.createdAt > TOKEN_TTL_MS) return null;

  const token = `mock_schoology_atoken_${crypto.randomUUID()}`;
  const secret = `mock_schoology_asecret_${crypto.randomUUID()}`;
  accessTokens.set(token, { secret });
  return { token, secret };
}

export function getAccessTokenSecret(token: string): string | undefined {
  return accessTokens.get(token)?.secret;
}

// Small parsing helper for the mock endpoints below — real Schoology
// obviously doesn't need to regex its own Authorization header, but our
// mock server plays that role over an HTTP boundary, so it has to.
export function extractOAuthParam(authorizationHeader: string, name: string): string | null {
  const match = authorizationHeader.match(new RegExp(`${name}="([^"]+)"`));
  return match ? decodeURIComponent(match[1]) : null;
}
