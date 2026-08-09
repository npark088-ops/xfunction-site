import { googleClassroomOAuthConfig } from "./google-classroom-oauth-config";
import { GoogleOAuthTokenResponse, GoogleIdTokenClaims } from "./google-classroom-types";

// REAL GOOGLE-SHAPED LOGIC
// ---------------------------------------------------------------------
// This file implements Google's actual documented OAuth2 + OIDC flow,
// nothing invented: https://developers.google.com/identity/protocols/oauth2/web-server
//
//   1. Send the user's browser to GET {authBaseUrl}/o/oauth2/v2/auth
//      with client_id, response_type=code, redirect_uri, state, scope,
//      access_type=offline (to also get a refresh_token back).
//   2. Google (after login + consent) redirects back to redirect_uri
//      with ?code=...&state=... (or ?error=... if the user declines).
//   3. Exchange that code via POST {tokenBaseUrl}/token for an
//      access_token — and, because "openid" is in the requested scope,
//      an id_token carrying the user's identity.
//
// Every URL here is built from googleClassroomOAuthConfig, which reads
// from environment variables. Point it at Google's real hosts and
// supply a real OAuth client's id/secret, and this exact code talks to
// the real Google API — no logic changes required. (Today it points at
// our local mock stand-in — see app/o/oauth2/v2/auth and app/token.)

export function buildAuthorizationUrl(state: string): string {
  const url = new URL("/o/oauth2/v2/auth", googleClassroomOAuthConfig.authBaseUrl);
  url.searchParams.set("client_id", googleClassroomOAuthConfig.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", googleClassroomOAuthConfig.redirectUri);
  url.searchParams.set("state", state);
  // Read-only access to courses and the student's own coursework, plus
  // "openid email profile" so the token exchange also returns an
  // id_token we can read the student's name/email from.
  url.searchParams.set(
    "scope",
    [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/classroom.courses.readonly",
      "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
    ].join(" ")
  );
  // Without this, Google only returns a refresh_token on the very first
  // consent ever granted for this client+user — offline access makes
  // that explicit and repeatable, matching Google's documented behavior.
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  return url.toString();
}

export async function exchangeCodeForToken(
  code: string
): Promise<GoogleOAuthTokenResponse> {
  const tokenUrl = new URL("/token", googleClassroomOAuthConfig.tokenBaseUrl);

  const response = await fetch(tokenUrl.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: googleClassroomOAuthConfig.clientId,
      client_secret: googleClassroomOAuthConfig.clientSecret,
      redirect_uri: googleClassroomOAuthConfig.redirectUri,
      code,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google token exchange failed (${response.status}): ${body}`);
  }

  return response.json();
}

// Real id_tokens are signed JWTs — a production integration MUST verify
// the signature against Google's published public keys (e.g. via the
// `google-auth-library` package's OAuth2Client.verifyIdToken()) before
// trusting any claim inside. This just decodes the payload, which is
// enough for our mock (whose token was never cryptographically signed
// in the first place) but would be a security bug against the real API.
export function decodeIdToken(idToken: string): GoogleIdTokenClaims {
  const payload = idToken.split(".")[1];
  const json = Buffer.from(payload, "base64url").toString("utf-8");
  return JSON.parse(json);
}
