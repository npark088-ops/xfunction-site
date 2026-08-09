import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildAuthorizationUrl } from "../../../../lib/blackboard-oauth";
import { createClient } from "../../../../lib/supabase/server";

// REAL BLACKBOARD-SHAPED LOGIC
// ---------------------------------------------------------------------
// Kicks off Blackboard's OAuth2 authorization code flow. Generates a
// random `state` value for CSRF protection, stashes it in an httpOnly
// cookie so /api/blackboard/callback can verify it round-tripped
// unmodified, then redirects the browser to Blackboard's authorization
// endpoint. This is the "Connect Blackboard" button's target. Same
// pattern as /api/canvas/connect.
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
  cookieStore.set("blackboard_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return NextResponse.redirect(buildAuthorizationUrl(state));
}
