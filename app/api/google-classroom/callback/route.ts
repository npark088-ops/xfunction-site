import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCodeForToken, decodeIdToken } from "../../../../lib/google-classroom-oauth";
import { saveGoogleClassroomToken } from "../../../../lib/google-classroom-token-store";
import { createClient } from "../../../../lib/supabase/server";

// REAL GOOGLE-SHAPED LOGIC
// ---------------------------------------------------------------------
// This is the redirect_uri Google's docs describe: it receives ?code
// and ?state back from the authorization step, verifies state against
// the cookie set in /api/google-classroom/connect (CSRF check), and
// exchanges the code for tokens exactly the way Google's OAuth2 docs
// say to — then decodes the id_token to get the student's name/email.
// The connection is then saved against the signed-in XFunction user
// (real Supabase-backed storage — see lib/google-classroom-token-store.ts).
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("google_classroom_oauth_state")?.value;
  cookieStore.delete("google_classroom_oauth_state");

  if (error) {
    return NextResponse.redirect(new URL("/courses?gclassroom=denied", request.url));
  }

  if (!code || !state || state !== expectedState) {
    return NextResponse.redirect(new URL("/courses?gclassroom=error", request.url));
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
    if (!token.id_token) {
      throw new Error("Token response missing id_token (was 'openid' in the requested scope?)");
    }
    const claims = decodeIdToken(token.id_token);
    await saveGoogleClassroomToken(supabase, user.id, token, claims);
    return NextResponse.redirect(new URL("/courses?gclassroom=connected", request.url));
  } catch (err) {
    console.error("Google Classroom token exchange failed:", err);
    return NextResponse.redirect(new URL("/courses?gclassroom=error", request.url));
  }
}
