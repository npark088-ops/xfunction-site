import { schoologyOAuthConfig } from "./schoology-oauth-config";
import { signOAuth1Request } from "./oauth1-signing";
import { SchoologyOAuthTokenPair, SchoologyUser } from "./schoology-types";

// REAL SCHOOLOGY-SHAPED LOGIC
// ---------------------------------------------------------------------
// This file implements Schoology's actual documented three-legged
// OAuth 1.0a flow, nothing invented:
// https://developers.schoology.com/api-documentation/rest-api-v1/
//
// Unlike Canvas/Google's OAuth2 (one authorize redirect, one code-for-
// token exchange), Schoology's OAuth1 flow is three steps, and every
// request — including these token-exchange requests themselves — is
// individually signed with HMAC-SHA1 (see lib/oauth1-signing.ts)
// instead of presenting a client secret in the request body:
//
//   1. GET {apiBaseUrl}/oauth/request_token, signed with just the
//      consumer key/secret (no user token yet). Returns an unauthorized
//      request token + secret.
//   2. Send the user's browser to
//      {appBaseUrl}/oauth/authorize?oauth_token=... to log in and
//      approve. Schoology redirects back to the registered callback URL
//      with the same oauth_token (Schoology's flow doesn't use
//      oauth_verifier the way strict RFC 5849 does).
//   3. Exchange the now-authorized request token for an access token via
//      GET {apiBaseUrl}/oauth/access_token, signed with the consumer
//      key/secret AND the request token/secret from step 1.
//
// Every URL here is built from schoologyOAuthConfig, which reads from
// environment variables. Point it at Schoology's real hosts and supply a
// real consumer key/secret, and this exact code talks to the real
// Schoology API — no logic changes required. (Today it points at our
// local mock stand-in — see app/v1/oauth/*, app/oauth/authorize, and
// app/v1/users/me.)

function parseTokenPairResponse(body: string): SchoologyOAuthTokenPair {
  const params = new URLSearchParams(body);
  const oauth_token = params.get("oauth_token");
  const oauth_token_secret = params.get("oauth_token_secret");
  if (!oauth_token || !oauth_token_secret) {
    throw new Error(`Malformed Schoology token response: ${body}`);
  }
  return { oauth_token, oauth_token_secret };
}

export async function getRequestToken(): Promise<SchoologyOAuthTokenPair> {
  const url = new URL("/oauth/request_token", schoologyOAuthConfig.apiBaseUrl).toString();
  const authHeader = signOAuth1Request({
    method: "GET",
    url,
    consumerKey: schoologyOAuthConfig.consumerKey,
    consumerSecret: schoologyOAuthConfig.consumerSecret,
    extraOAuthParams: { oauth_callback: schoologyOAuthConfig.callbackUrl },
  });

  const response = await fetch(url, {
    headers: { Authorization: authHeader },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Schoology request_token failed (${response.status}): ${await response.text()}`);
  }
  return parseTokenPairResponse(await response.text());
}

export function buildAuthorizationUrl(requestToken: string): string {
  const url = new URL("/oauth/authorize", schoologyOAuthConfig.appBaseUrl);
  url.searchParams.set("oauth_token", requestToken);
  return url.toString();
}

export async function getAccessToken(
  requestToken: string,
  requestTokenSecret: string
): Promise<SchoologyOAuthTokenPair> {
  const url = new URL("/oauth/access_token", schoologyOAuthConfig.apiBaseUrl).toString();
  const authHeader = signOAuth1Request({
    method: "GET",
    url,
    consumerKey: schoologyOAuthConfig.consumerKey,
    consumerSecret: schoologyOAuthConfig.consumerSecret,
    token: requestToken,
    tokenSecret: requestTokenSecret,
  });

  const response = await fetch(url, {
    headers: { Authorization: authHeader },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Schoology access_token failed (${response.status}): ${await response.text()}`);
  }
  return parseTokenPairResponse(await response.text());
}

export async function getCurrentUser(
  accessToken: string,
  accessTokenSecret: string
): Promise<SchoologyUser> {
  const url = new URL("/users/me", schoologyOAuthConfig.apiBaseUrl).toString();
  const authHeader = signOAuth1Request({
    method: "GET",
    url,
    consumerKey: schoologyOAuthConfig.consumerKey,
    consumerSecret: schoologyOAuthConfig.consumerSecret,
    token: accessToken,
    tokenSecret: accessTokenSecret,
  });

  const response = await fetch(url, {
    headers: { Authorization: authHeader, Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Schoology users/me failed (${response.status}): ${await response.text()}`);
  }
  return response.json();
}
