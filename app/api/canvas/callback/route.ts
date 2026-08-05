import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCodeForToken } from "../../../../lib/canvas-oauth";
import { saveCanvasToken } from "../../../../lib/canvas-token-store";
import { createClient } from "../../../../lib/supabase/server";

// REAL CANVAS-SHAPED LOGIC
// ---------------------------------------------------------------------
// This is the redirect_uri Canvas's docs describe: it receives ?code
// and ?state back from the authorization step, verifies state against
// the cookie set in /api/canvas/connect (CSRF check), and exchanges the
// code for an access token exactly the way Canvas's OAuth2 docs say to.
// The token then gets saved against the signed-in xFunction user (real
// Supabase-backed storage — see lib/canvas-token-store.ts).
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("canvas_oauth_state")?.value;
  cookieStore.delete("canvas_oauth_state");

  if (error) {
    return NextResponse.redirect(new URL("/courses?canvas=denied", request.url));
  }

  if (!code || !state || state !== expectedState) {
    return NextResponse.redirect(new URL("/courses?canvas=error", request.url));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login?next=/courses", request.url));
  }

  try {
    const token = await exchangeCodeForToken(code);
    await saveCanvasToken(supabase, user.id, token);
    return NextResponse.redirect(new URL("/courses?canvas=connected", request.url));
  } catch (err) {
    console.error("Canvas token exchange failed:", err);
    return NextResponse.redirect(new URL("/courses?canvas=error", request.url));
  }
}
