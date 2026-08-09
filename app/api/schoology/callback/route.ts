import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAccessToken, getCurrentUser } from "../../../../lib/schoology-oauth";
import { saveSchoologyToken } from "../../../../lib/schoology-token-store";
import { createClient } from "../../../../lib/supabase/server";

// REAL SCHOOLOGY-SHAPED LOGIC
// ---------------------------------------------------------------------
// This is the callback URL Schoology's docs describe: it receives
// ?oauth_token back from the authorization step (note: no
// oauth_verifier — Schoology's documented flow is simplified relative
// to strict RFC 5849), verifies it matches the request token this
// browser actually started with (CSRF check, same purpose as Canvas/
// Google's `state` param, just using the token itself since Schoology's
// flow doesn't have a separate state param), exchanges it for an access
// token, then fetches the user's own profile (Schoology's token
// response doesn't include identity the way Canvas's does) before
// saving the connection against the signed-in XFunction user.
export async function GET(request: NextRequest) {
  const oauthToken = request.nextUrl.searchParams.get("oauth_token");
  const error = request.nextUrl.searchParams.get("error");

  const cookieStore = await cookies();
  const expectedToken = cookieStore.get("schoology_request_token")?.value;
  const requestTokenSecret = cookieStore.get("schoology_request_token_secret")?.value;
  cookieStore.delete("schoology_request_token");
  cookieStore.delete("schoology_request_token_secret");

  if (error) {
    return NextResponse.redirect(new URL("/courses?schoology=denied", request.url));
  }

  if (!oauthToken || !requestTokenSecret || oauthToken !== expectedToken) {
    return NextResponse.redirect(new URL("/courses?schoology=error", request.url));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login?next=/courses", request.url));
  }

  try {
    const accessToken = await getAccessToken(oauthToken, requestTokenSecret);
    const profile = await getCurrentUser(accessToken.oauth_token, accessToken.oauth_token_secret);
    await saveSchoologyToken(supabase, user.id, accessToken, profile);
    return NextResponse.redirect(new URL("/courses?schoology=connected", request.url));
  } catch (err) {
    console.error("Schoology token exchange failed:", err);
    return NextResponse.redirect(new URL("/courses?schoology=error", request.url));
  }
}
