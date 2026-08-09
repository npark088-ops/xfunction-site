import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCodeForToken, getUser } from "../../../../lib/blackboard-oauth";
import { saveBlackboardToken } from "../../../../lib/blackboard-token-store";
import { createClient } from "../../../../lib/supabase/server";

// REAL BLACKBOARD-SHAPED LOGIC
// ---------------------------------------------------------------------
// This is the redirect_uri Blackboard's docs describe: it receives
// ?code and ?state back from the authorization step, verifies state
// against the cookie set in /api/blackboard/connect (CSRF check), and
// exchanges the code for a token exactly the way Blackboard's OAuth2
// docs say to (HTTP Basic client auth) — then looks up the authorizing
// user's name, since the token response only carries their id. The
// connection is then saved against the signed-in XFunction user.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("blackboard_oauth_state")?.value;
  cookieStore.delete("blackboard_oauth_state");

  if (error) {
    return NextResponse.redirect(new URL("/courses?blackboard=denied", request.url));
  }

  if (!code || !state || state !== expectedState) {
    return NextResponse.redirect(new URL("/courses?blackboard=error", request.url));
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
    const profile = await getUser(token.access_token, token.user_id);
    await saveBlackboardToken(supabase, user.id, token, profile);
    return NextResponse.redirect(new URL("/courses?blackboard=connected", request.url));
  } catch (err) {
    console.error("Blackboard token exchange failed:", err);
    return NextResponse.redirect(new URL("/courses?blackboard=error", request.url));
  }
}
