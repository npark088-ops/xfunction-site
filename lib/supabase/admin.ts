import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role Supabase client — bypasses RLS and is the ONLY role
// allowed to call the locked-down SECURITY DEFINER functions
// (set_pro_on_checkout, set_pro_on_cancellation,
// get_onboarding_email_candidates, mark_onboarding_email_sent).
//
// Server-only, on purpose:
//   - `import "server-only"` makes the build fail if a Client Component
//     ever imports this file.
//   - SUPABASE_SERVICE_ROLE_KEY must NEVER be prefixed NEXT_PUBLIC_ —
//     that prefix inlines the value into the browser bundle.
// Only call this from route handlers/server code where the caller has
// already been authenticated some other way (Stripe signature check,
// CRON_SECRET bearer token, or a verified user session).
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_URL) is not set");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
