import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildAuthorizationUrl } from "../../../../lib/canvas-oauth";
import { createClient } from "../../../../lib/supabase/server";

// REAL CANVAS-SHAPED LOGIC
// ---------------------------------------------------------------------
// Kicks off Canvas's OAuth2 authorization code flow. Generates a random
// `state` value — Canvas's docs recommend this for CSRF protection —
// stashes it in an httpOnly cookie so /api/canvas/callback can verify
// it round-tripped unmodified, then redirects the browser to Canvas's
// authorization endpoint. This is the "Connect Canvas" button's target.
//
// We need to know *whose* Canvas connection this is before we save a
// token, so this route requires an XFunction session (Supabase) first.
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login?next=/app", request.url));
  }

  const state = crypto.randomUUID();

  const cookieStore = await cookies();
  cookieStore.set("canvas_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 600, // 10 minutes to complete the flow
    path: "/",
  });

  return NextResponse.redirect(buildAuthorizationUrl(state));
}
