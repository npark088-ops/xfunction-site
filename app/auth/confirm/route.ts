import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "../../../lib/supabase/server";

// Where Supabase's email confirmation links land. Supabase's default
// "Confirm signup" template points at {{ .ConfirmationURL }}, which
// redirects the browser to us with the session as a URL *hash*
// fragment (#access_token=...) — hash fragments never reach the
// server, so a route handler can't read them, and nothing happens.
//
// The fix is to have the email template link here instead, with a
// token_hash query param (which IS visible server-side), and verify it
// with verifyOtp(). See supabase/migrations/README or the setup notes
// for the exact template change to make in the Supabase dashboard:
// Authentication → Email Templates → "Confirm signup" → set the link to
//   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/app
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/app";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
}
