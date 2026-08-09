import { NextRequest } from "next/server";
import { schoologyOAuthConfig } from "../../../../lib/schoology-oauth-config";
import { verifyOAuth1Signature } from "../../../../lib/oauth1-signing";
import { issueRequestToken, extractOAuthParam } from "../../../../lib/mock-schoology-server-store";

// FAKE STAND-IN ONLY
// ---------------------------------------------------------------------
// Lives at /v1/oauth/request_token — the exact path real Schoology
// serves this at (https://api.schoology.com/v1/oauth/request_token).
// Step 1 of the three-legged OAuth1 flow: verifies the incoming
// HMAC-SHA1 signature (real Schoology would too) using just the
// consumer key/secret — there's no user token yet at this stage — then
// issues an unauthorized request token + secret pair, exactly like
// real Schoology's response shape (form-urlencoded body, not JSON).
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return new Response("Missing Authorization header", { status: 401 });
  }

  const valid = verifyOAuth1Signature(
    authHeader,
    "GET",
    request.url,
    schoologyOAuthConfig.consumerKey,
    schoologyOAuthConfig.consumerSecret
  );
  if (!valid) {
    return new Response("Invalid OAuth signature", { status: 401 });
  }

  const callbackUrl = extractOAuthParam(authHeader, "oauth_callback") || schoologyOAuthConfig.callbackUrl;
  const { token, secret } = issueRequestToken(callbackUrl);

  const body = new URLSearchParams({
    oauth_token: token,
    oauth_token_secret: secret,
    oauth_callback_confirmed: "true",
  }).toString();

  return new Response(body, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}
