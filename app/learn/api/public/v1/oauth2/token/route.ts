import { NextRequest } from "next/server";
import { blackboardOAuthConfig } from "../../../../../../../lib/blackboard-oauth-config";
import { consumeAuthorizationCode } from "../../../../../../../lib/mock-blackboard-server-store";
import { BlackboardOAuthTokenResponse } from "../../../../../../../lib/blackboard-types";

// FAKE STAND-IN ONLY
// ---------------------------------------------------------------------
// Lives at /learn/api/public/v1/oauth2/token — the exact path a real
// Blackboard Learn instance serves its token endpoint at, for the same
// reason as the authorizationcode route above: our client code only
// ever knows "{BLACKBOARD_BASE_URL}/learn/api/public/v1/oauth2/token".
// Point that env var at a real Learn domain and this file is dead code,
// safe to delete.
//
// Real Blackboard authenticates this request via HTTP Basic
// client_id:client_secret in the Authorization header — NOT a
// client_secret form field the way Canvas/Google do it — so that's what
// gets checked here too.
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization") ?? "";
  const basicMatch = authHeader.match(/^Basic (.+)$/);
  if (!basicMatch) {
    return Response.json({ error: "invalid_client" }, { status: 401 });
  }
  const [clientId, clientSecret] = Buffer.from(basicMatch[1], "base64").toString("utf-8").split(":");

  if (
    clientId !== blackboardOAuthConfig.clientId ||
    clientSecret !== blackboardOAuthConfig.clientSecret
  ) {
    return Response.json({ error: "invalid_client" }, { status: 401 });
  }

  const formData = await request.formData();
  const grantType = formData.get("grant_type");
  const redirectUri = String(formData.get("redirect_uri") ?? "");
  const code = String(formData.get("code") ?? "");

  if (grantType !== "authorization_code") {
    return Response.json({ error: "unsupported_grant_type" }, { status: 400 });
  }

  const isValidCode = consumeAuthorizationCode(code, clientId, redirectUri);
  if (!isValidCode) {
    return Response.json({ error: "invalid_grant" }, { status: 400 });
  }

  const tokenResponse: BlackboardOAuthTokenResponse = {
    access_token: `mock_blackboard_access_${crypto.randomUUID()}`,
    token_type: "bearer",
    expires_in: 3600,
    refresh_token: `mock_blackboard_refresh_${crypto.randomUUID()}`,
    scope: "read",
    user_id: "600001",
  };

  return Response.json(tokenResponse);
}
