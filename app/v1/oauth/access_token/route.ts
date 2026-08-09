import { NextRequest } from "next/server";
import { schoologyOAuthConfig } from "../../../../lib/schoology-oauth-config";
import { verifyOAuth1Signature } from "../../../../lib/oauth1-signing";
import {
  getRequestTokenSecret,
  exchangeRequestTokenForAccessToken,
  extractOAuthParam,
} from "../../../../lib/mock-schoology-server-store";

// FAKE STAND-IN ONLY
// ---------------------------------------------------------------------
// Lives at /v1/oauth/access_token — the exact path real Schoology
// serves this at. Step 3 of the three-legged OAuth1 flow: verifies the
// signature using the consumer secret AND the (now-authorized) request
// token's secret, then exchanges it for a long-lived access token +
// secret pair, exactly like real Schoology's response shape.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return new Response("Missing Authorization header", { status: 401 });
  }

  const requestToken = extractOAuthParam(authHeader, "oauth_token");
  if (!requestToken) {
    return new Response("Missing oauth_token", { status: 400 });
  }

  const requestTokenSecret = getRequestTokenSecret(requestToken);
  if (!requestTokenSecret) {
    return new Response("Unknown or expired request token", { status: 401 });
  }

  const valid = verifyOAuth1Signature(
    authHeader,
    "GET",
    request.url,
    schoologyOAuthConfig.consumerKey,
    schoologyOAuthConfig.consumerSecret,
    requestTokenSecret
  );
  if (!valid) {
    return new Response("Invalid OAuth signature", { status: 401 });
  }

  const accessToken = exchangeRequestTokenForAccessToken(requestToken);
  if (!accessToken) {
    return new Response("Request token was never authorized", { status: 401 });
  }

  const body = new URLSearchParams({
    oauth_token: accessToken.token,
    oauth_token_secret: accessToken.secret,
  }).toString();

  return new Response(body, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}
