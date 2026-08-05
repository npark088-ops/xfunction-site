import { NextRequest } from "next/server";
import { canvasOAuthConfig } from "../../../../lib/canvas-oauth-config";
import { consumeAuthorizationCode } from "../../../../lib/mock-canvas-server-store";
import { CanvasOAuthTokenResponse } from "../../../../lib/canvas-types";

// FAKE STAND-IN ONLY
// ---------------------------------------------------------------------
// Lives at /login/oauth2/token — the exact path real Canvas serves its
// token endpoint at, for the same reason as app/login/oauth2/auth: our
// client code only ever knows "{CANVAS_BASE_URL}/login/oauth2/token".
// Point CANVAS_BASE_URL at a real Canvas domain and this file is dead
// code, safe to delete.
//
// The response body below is shaped exactly like Canvas's real
// response (see CanvasOAuthTokenResponse in lib/canvas-types.ts) —
// only the values inside it are fake.
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

  // In a real integration this check happens on Canvas's own servers,
  // against the Developer Key you registered. Here we just compare
  // against the same mock credentials the client side was configured
  // with (lib/canvas-oauth-config.ts).
  if (clientId !== canvasOAuthConfig.clientId || clientSecret !== canvasOAuthConfig.clientSecret) {
    return Response.json({ error: "invalid_client" }, { status: 401 });
  }

  const isValidCode = consumeAuthorizationCode(code, clientId, redirectUri);
  if (!isValidCode) {
    return Response.json({ error: "invalid_grant" }, { status: 400 });
  }

  const tokenResponse: CanvasOAuthTokenResponse = {
    access_token: `mock_access_${crypto.randomUUID()}`,
    token_type: "Bearer",
    user: {
      id: 999001,
      name: "Demo Student (Mock Canvas)",
    },
    refresh_token: `mock_refresh_${crypto.randomUUID()}`,
    expires_in: 3600,
  };

  return Response.json(tokenResponse);
}
