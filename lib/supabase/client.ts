import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client — safe to use in Client Components. Uses
// the public anon key, which is meant to be exposed; access to data is
// enforced by Row Level Security policies in the database, not by
// keeping this key secret.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
