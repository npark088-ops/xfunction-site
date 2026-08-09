import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getRequestToken, buildAuthorizationUrl } from "../../../../lib/schoology-oauth";
import { createClient } from "../../../../lib/supabase/server";

// REAL SCHOOLOGY-SHAPED LOGIC
// ---------------------------------------------------------------------
// Step 1+2 of Schoology's three-legged OAuth1 flow: fetches an
// unauthorized request token (signed with just the consumer key/secret),
// stashes the token's SECRET in an httpOnly cookie — unlike Canvas/
// Google's random CSRF `state`, this secret is load-bearing: it's
// required to sign the access-token exchange in
// /api/schoology/callback, not just to verify round-tripping — then
// redirects the browser to Schoology's authorization screen. This is
// the "Connect Schoology" button's target.
//
// We need to know *whose* Schoology connection this is before we save a
// token, so this route requires an XFunction session first.
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login?next=/courses", request.url));
  }

  try {
    const { oauth_token, oauth_token_secret } = await getRequestToken();

    const cookieStore = await cookies();
    cookieStore.set("schoology_request_token", oauth_token, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });
    cookieStore.set("schoology_request_token_secret", oauth_token_secret, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });

    return NextResponse.redirect(buildAuthorizationUrl(oauth_token));
  } catch (err) {
    console.error("Schoology request_token failed:", err);
    return NextResponse.redirect(new URL("/courses?schoology=error", request.url));
  }
}
