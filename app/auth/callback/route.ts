import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

// Where Supabase sends the user back after they click the confirmation
// link in the sign-up email (see emailRedirectTo in app/login/page.tsx).
// Exchanges the one-time code in the link for a real session.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/app";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
}
