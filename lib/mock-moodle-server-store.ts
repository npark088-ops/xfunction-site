// FAKE STAND-IN ONLY
// ---------------------------------------------------------------------
// Plays the role of a Moodle site's own backend — the part that, in a
// real integration, would run entirely on the school's self-hosted
// Moodle instance and that we would never write ourselves. Exists
// purely so the credential-exchange flow can be built and demoed
// without a real Moodle site. Delete it (along with app/login/token.php
// and app/webservice/rest/server.php) once students are entering a real
// school's Moodle URL — nothing on the "our app" side depends on it
// directly, only on the HTTP responses it produces.

interface IssuedToken {
  userId: number;
  fullName: string;
}

declare global {
  var __mockMoodleTokens: Map<string, IssuedToken> | undefined;
}

const issuedTokens = globalThis.__mockMoodleTokens ?? new Map<string, IssuedToken>();
globalThis.__mockMoodleTokens = issuedTokens;

// Real Moodle checks username+password against the site's actual user
// accounts. Our mock has no user database to check against, so it
// accepts any non-empty username/password — the point of this stand-in
// is exercising the request/response shape, not simulating real auth.
export function issueTokenForCredentials(username: string, password: string): string | null {
  if (!username || !password) return null;

  const token = `mock_moodle_token_${crypto.randomUUID()}`;
  issuedTokens.set(token, {
    userId: 700001,
    fullName: "Demo Student (Mock Moodle)",
  });
  return token;
}

export function getTokenInfo(token: string): IssuedToken | undefined {
  return issuedTokens.get(token);
}
