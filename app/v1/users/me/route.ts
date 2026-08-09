import { NextRequest } from "next/server";
import { schoologyOAuthConfig } from "../../../../lib/schoology-oauth-config";
import { verifyOAuth1Signature } from "../../../../lib/oauth1-signing";
import { getAccessTokenSecret, extractOAuthParam } from "../../../../lib/mock-schoology-server-store";
import { SchoologyUser } from "../../../../lib/schoology-types";

// FAKE STAND-IN ONLY
// ---------------------------------------------------------------------
// Lives at /v1/users/me — the exact path real Schoology serves the
// signed-in user's own profile at, used once right after the access
// token is issued (see lib/schoology-oauth.ts's getCurrentUser()) to
// find out who actually just connected, since Schoology's token
// endpoints (unlike Canvas's) don't return a name/id directly.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return new Response("Missing Authorization header", { status: 401 });
  }

  const accessToken = extractOAuthParam(authHeader, "oauth_token");
  if (!accessToken) {
    return new Response("Missing oauth_token", { status: 400 });
  }

  const accessTokenSecret = getAccessTokenSecret(accessToken);
  if (!accessTokenSecret) {
    return new Response("Invalid or expired access token", { status: 401 });
  }

  const valid = verifyOAuth1Signature(
    authHeader,
    "GET",
    request.url,
    schoologyOAuthConfig.consumerKey,
    schoologyOAuthConfig.consumerSecret,
    accessTokenSecret
  );
  if (!valid) {
    return new Response("Invalid OAuth signature", { status: 401 });
  }

  const profile: SchoologyUser = {
    id: 888001,
    name_display: "Demo Student (Mock Schoology)",
    primary_email: "demo.student@example.com",
  };

  return Response.json(profile);
}
