import { blackboardOAuthConfig } from "./blackboard-oauth-config";
import { BlackboardOAuthTokenResponse, BlackboardUser } from "./blackboard-types";

// REAL BLACKBOARD-SHAPED LOGIC
// ---------------------------------------------------------------------
// This file implements Blackboard Learn's actual documented three-legged
// (user context) OAuth2 flow, nothing invented:
// https://developer.blackboard.com/portal/displayApi (REST API "Getting
// Started" / "OAuth 2 Authorization Code Flow")
//
//   1. Send the user's browser to
//      GET {baseUrl}/learn/api/public/v1/oauth2/authorizationcode
//      with client_id, response_type=code, redirect_uri, state, scope.
//   2. Blackboard (after login + consent) redirects back to redirect_uri
//      with ?code=...&state=... (or ?error=... if the user declines).
//   3. Exchange that code via POST {baseUrl}/learn/api/public/v1/oauth2/token
//      for an access_token — authenticating with HTTP Basic
//      client_id:client_secret (not a client_secret POST field the way
//      Canvas/Google put it), per Blackboard's documented token
//      endpoint.
//   4. The token response includes the authorizing user's id but not
//      their name, so a follow-up GET to
//      {baseUrl}/learn/api/public/v1/users/{userId} fills that in.
//
// Every URL here is built from blackboardOAuthConfig, which reads from
// environment variables. Point it at a real Blackboard Learn domain and
// supply a real REST API integration's credentials, and this exact code
// talks to the real Blackboard API — no logic changes required. (Today
// it points at our local mock stand-in — see
// app/learn/api/public/v1/oauth2/* and app/learn/api/public/v1/users.)

export function buildAuthorizationUrl(state: string): string {
  const url = new URL("/learn/api/public/v1/oauth2/authorizationcode", blackboardOAuthConfig.baseUrl);
  url.searchParams.set("client_id", blackboardOAuthConfig.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", blackboardOAuthConfig.redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", "read");
  return url.toString();
}

export async function exchangeCodeForToken(
  code: string
): Promise<BlackboardOAuthTokenResponse> {
  const tokenUrl = new URL("/learn/api/public/v1/oauth2/token", blackboardOAuthConfig.baseUrl);
  const basicAuth = Buffer.from(
    `${blackboardOAuthConfig.clientId}:${blackboardOAuthConfig.clientSecret}`
  ).toString("base64");

  const response = await fetch(tokenUrl.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: blackboardOAuthConfig.redirectUri,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Blackboard token exchange failed (${response.status}): ${body}`);
  }

  return response.json();
}

export async function getUser(accessToken: string, userId: string): Promise<BlackboardUser> {
  const url = new URL(`/learn/api/public/v1/users/${userId}`, blackboardOAuthConfig.baseUrl);

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Blackboard user lookup failed (${response.status}): ${body}`);
  }

  return response.json();
}
