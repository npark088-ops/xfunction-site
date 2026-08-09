import { createHmac, randomBytes } from "crypto";

// REAL OAUTH 1.0a SIGNING (RFC 5849)
// ---------------------------------------------------------------------
// Schoology's real API authenticates every request — not just the OAuth
// handshake itself — with an OAuth 1.0a HMAC-SHA1 signature in the
// Authorization header (docs: https://developers.schoology.com/api-documentation/rest-api-v1/,
// "Two-Legged" and "Three-Legged" OAuth sections). This is a genuine
// implementation of that signing algorithm, not a mock — it's exactly
// what a real integration needs to talk to Schoology's actual servers,
// and exactly what lib/mock-schoology-server-store.ts uses to verify
// incoming "signed" requests against our local stand-in.

// RFC 3986 unreserved characters (A-Z a-z 0-9 - . _ ~) are left alone;
// everything else is percent-encoded. encodeURIComponent() alone isn't
// quite enough — OAuth1 additionally requires encoding !, *, ', (, ).
function percentEncode(value: string): string {
  return encodeURIComponent(value).replace(
    /[!*'()]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase()
  );
}

export interface OAuth1SignParams {
  method: "GET" | "POST";
  url: string;
  consumerKey: string;
  consumerSecret: string;
  // Present for the access-token step and every authenticated API call;
  // absent for the very first request-token step.
  token?: string;
  tokenSecret?: string;
  // e.g. oauth_callback for the request-token step. Any querystring
  // params on `url` are already included automatically — this is only
  // for OAuth-protocol params that aren't part of the URL.
  extraOAuthParams?: Record<string, string>;
}

// Builds the `Authorization: OAuth ...` header value for a single
// request, per RFC 5849 section 3.4 (HMAC-SHA1 signature base string
// construction + signing).
export function signOAuth1Request(params: OAuth1SignParams): string {
  const url = new URL(params.url);
  const queryParams: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: params.consumerKey,
    oauth_nonce: randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_version: "1.0",
    ...(params.token ? { oauth_token: params.token } : {}),
    ...params.extraOAuthParams,
  };

  // Signature base string covers ALL params (query string + OAuth
  // params), sorted by key then value after percent-encoding — RFC 5849
  // section 3.4.1.3.2.
  const allParams = { ...queryParams, ...oauthParams };
  const paramString = Object.keys(allParams)
    .sort()
    .map((key) => `${percentEncode(key)}=${percentEncode(allParams[key])}`)
    .join("&");

  const baseUrl = `${url.protocol}//${url.host}${url.pathname}`;
  const signatureBase = [
    params.method,
    percentEncode(baseUrl),
    percentEncode(paramString),
  ].join("&");

  const signingKey = `${percentEncode(params.consumerSecret)}&${percentEncode(
    params.tokenSecret ?? ""
  )}`;

  const signature = createHmac("sha1", signingKey).update(signatureBase).digest("base64");

  const headerParams: Record<string, string> = { ...oauthParams, oauth_signature: signature };
  const headerString = Object.keys(headerParams)
    .map((key) => `${percentEncode(key)}="${percentEncode(headerParams[key])}"`)
    .join(", ");

  return `OAuth ${headerString}`;
}

// Pulls every key="value" pair out of an `Authorization: OAuth ...`
// header generically, rather than hardcoding a fixed list of expected
// param names — signOAuth1Request() can sign arbitrary extraOAuthParams
// (e.g. oauth_callback on the request-token step), and those have to be
// reconstructed here too or the recomputed signature base string won't
// match what the client actually signed.
function parseAuthorizationHeader(header: string): Record<string, string> {
  const params: Record<string, string> = {};
  const regex = /(\w+)="([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(header)) !== null) {
    params[match[1]] = decodeURIComponent(match[2]);
  }
  return params;
}

// Verifies an incoming Authorization header against the same secrets —
// used by the mock Schoology server (lib/mock-schoology-server-store.ts)
// to check requests the same way Schoology's real servers would.
// Recomputes the expected signature and compares.
export function verifyOAuth1Signature(
  authorizationHeader: string,
  method: "GET" | "POST",
  url: string,
  consumerKey: string,
  consumerSecret: string,
  tokenSecret?: string
): boolean {
  const headerParams = parseAuthorizationHeader(authorizationHeader);
  const providedSignature = headerParams.oauth_signature;
  if (!providedSignature) return false;
  if (headerParams.oauth_consumer_key !== consumerKey) return false;

  const { oauth_signature, ...oauthParamsForBase } = headerParams;

  const parsedUrl = new URL(url);
  const queryParams: Record<string, string> = {};
  parsedUrl.searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });

  const allParams = { ...queryParams, ...oauthParamsForBase };
  const paramString = Object.keys(allParams)
    .sort()
    .map((key) => `${percentEncode(key)}=${percentEncode(allParams[key])}`)
    .join("&");

  const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname}`;
  const signatureBase = [method, percentEncode(baseUrl), percentEncode(paramString)].join("&");
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret ?? "")}`;
  const expectedSignature = createHmac("sha1", signingKey).update(signatureBase).digest("base64");

  return expectedSignature === providedSignature;
}
