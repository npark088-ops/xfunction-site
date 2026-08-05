import { canvasOAuthConfig } from "./canvas-oauth-config";
import { CanvasOAuthTokenResponse } from "./canvas-types";

// REAL CANVAS-SHAPED LOGIC
// ---------------------------------------------------------------------
// This file implements Canvas's actual documented OAuth2 flow, nothing
// invented: https://canvas.instructure.com/doc/api/file.oauth.html
//
//   1. Send the user's browser to GET {baseUrl}/login/oauth2/auth
//      with client_id, response_type=code, redirect_uri, state, scope.
//   2. Canvas (after login + consent) redirects back to redirect_uri
//      with ?code=...&state=... (or ?error=... if the user declines).
//   3. Exchange that code via POST {baseUrl}/login/oauth2/token for an
//      access_token.
//
// Every URL here is built from canvasOAuthConfig, which reads from
// environment variables. Point CANVAS_BASE_URL at a real Canvas domain
// and supply a real Developer Key's client id/secret, and this exact
// code talks to the real Canvas API — no logic changes required.
// (Today it points at our local mock stand-in — see app/login/oauth2/.)

export function buildAuthorizationUrl(state: string): string {
  const url = new URL("/login/oauth2/auth", canvasOAuthConfig.baseUrl);
  url.searchParams.set("client_id", canvasOAuthConfig.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", canvasOAuthConfig.redirectUri);
  url.searchParams.set("state", state);
  // Space-separated scope list, just like Canvas expects. Read-only
  // access to courses and assignment groups is all the grade
  // calculator needs.
  url.searchParams.set(
    "scope",
    "url:GET|/api/v1/courses url:GET|/api/v1/courses/:course_id/assignment_groups"
  );
  return url.toString();
}

export async function exchangeCodeForToken(
  code: string
): Promise<CanvasOAuthTokenResponse> {
  const tokenUrl = new URL("/login/oauth2/token", canvasOAuthConfig.baseUrl);

  const response = await fetch(tokenUrl.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: canvasOAuthConfig.clientId,
      client_secret: canvasOAuthConfig.clientSecret,
      redirect_uri: canvasOAuthConfig.redirectUri,
      code,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Canvas token exchange failed (${response.status}): ${body}`);
  }

  return response.json();
}
