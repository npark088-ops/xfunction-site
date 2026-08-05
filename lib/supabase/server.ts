import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

// Server-side Supabase client — for use in Server Components, Route
// Handlers, and Server Actions. Reads/writes the session via cookies,
// so a signed-in user's session is available on the server without a
// separate token to manage. In a Server Component, cookie writes are
// silently skipped (Next.js doesn't allow it there) — the proxy
// (proxy.ts) is what keeps the session cookie itself refreshed.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — safe to ignore since
            // proxy.ts refreshes the session cookie on every request.
          }
        },
      },
    }
  );
}

// A page's layout and the page itself often both need the signed-in
// user (e.g. the dashboard sidebar and the page content below it) —
// React's cache() dedupes those into a single Supabase call per
// request instead of one per component that asks.
export const getCachedUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
