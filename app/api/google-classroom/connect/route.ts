import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildAuthorizationUrl } from "../../../../lib/google-classroom-oauth";
import { createClient } from "../../../../lib/supabase/server";

// REAL GOOGLE-SHAPED LOGIC
// ---------------------------------------------------------------------
// Kicks off Google's OAuth2 authorization code flow. Generates a random
// `state` value — Google's docs recommend this for CSRF protection —
// stashes it in an httpOnly cookie so /api/google-classroom/callback can
// verify it round-tripped unmodified, then redirects the browser to
// Google's authorization endpoint. This is "Connect Google Classroom"'s
// target. Same pattern as /api/canvas/connect.
//
// We need to know *whose* Google Classroom connection this is before we
// save a token, so this route requires an XFunction session first.
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login?next=/courses", request.url));
  }

  const state = crypto.randomUUID();

  const cookieStore = await cookies();
  cookieStore.set("google_classroom_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 600, // 10 minutes to complete the flow
    path: "/",
  });

  return NextResponse.redirect(buildAuthorizationUrl(state));
}
