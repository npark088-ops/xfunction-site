import { NextRequest } from "next/server";
import { googleClassroomOAuthConfig } from "../../lib/google-classroom-oauth-config";
import { consumeAuthorizationCode } from "../../lib/mock-google-server-store";
import { GoogleOAuthTokenResponse } from "../../lib/google-classroom-types";

// FAKE STAND-IN ONLY
// ---------------------------------------------------------------------
// Lives at /token — the exact path real Google serves its token
// endpoint at (https://oauth2.googleapis.com/token), for the same
// reason as app/o/oauth2/v2/auth: our client code only ever knows
// "{GOOGLE_OAUTH_TOKEN_BASE_URL}/token". Point that env var at Google's
// real host and this file is dead code, safe to delete.
//
// The response body below is shaped exactly like Google's real response
// (see GoogleOAuthTokenResponse in lib/google-classroom-types.ts) —
// including a JWT-shaped id_token — only the values inside are fake and
// the "signature" segment is never actually signed (real Google's is;
// see the verification warning in lib/google-classroom-oauth.ts).
function buildMockIdToken() {
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: "http://localhost:3000",
    sub: "100000000001",
    name: "Demo Student (Mock Google Classroom)",
    email: "demo.student@example.com",
    email_verified: true,
    aud: googleClassroomOAuthConfig.clientId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
  const encode = (obj: object) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  return `${encode(header)}.${encode(payload)}.mock-unsigned-signature`;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const grantType = formData.get("grant_type");
  const clientId = String(formData.get("client_id") ?? "");
  const clientSecret = String(formData.get("client_secret") ?? "");
  const redirectUri = String(formData.get("redirect_uri") ?? "");
  const code = String(formData.get("code") ?? "");

  if (grantType !== "authorization_code") {
    return Response.json({ error: "unsupported_grant_type" }, { status: 400 });
  }

  // In a real integration this check happens on Google's own servers,
  // against the OAuth client you registered in Cloud Console. Here we
  // just compare against the same mock credentials the client side was
  // configured with (lib/google-classroom-oauth-config.ts).
  if (
    clientId !== googleClassroomOAuthConfig.clientId ||
    clientSecret !== googleClassroomOAuthConfig.clientSecret
  ) {
    return Response.json({ error: "invalid_client" }, { status: 401 });
  }

  const isValidCode = consumeAuthorizationCode(code, clientId, redirectUri);
  if (!isValidCode) {
    return Response.json({ error: "invalid_grant" }, { status: 400 });
  }

  const tokenResponse: GoogleOAuthTokenResponse = {
    access_token: `mock_google_access_${crypto.randomUUID()}`,
    expires_in: 3600,
    scope:
      "openid email profile https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.coursework.me.readonly",
    token_type: "Bearer",
    refresh_token: `mock_google_refresh_${crypto.randomUUID()}`,
    id_token: buildMockIdToken(),
  };

  return Response.json(tokenResponse);
}
