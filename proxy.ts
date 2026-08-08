import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Next.js 16 renamed Middleware to Proxy (same mechanism, new name/file).
// This runs on every request (see matcher below) to:
//   1. Refresh the Supabase session cookie, so it doesn't silently expire.
//   2. Gate the signed-in parts of the app (/today, /overview, /ask,
//      /courses, /compare, /search, /schedule, /trends, /tasks, /grades,
//      /settings, /parent — /app is a compat redirect to /overview)
//      behind auth, redirecting to /login when there's no session.
//   3. Redirect an already-signed-in user away from /login.
//
// This is an "optimistic" check (cookie-only, no DB round trip) per
// Next.js's auth guidance — real authorization for data access still
// happens at the database via Row Level Security policies.

const PROTECTED_PREFIXES = ["/app", "/today", "/overview", "/ask", "/courses", "/compare", "/search", "/schedule", "/trends", "/tasks", "/grades", "/settings", "/parent"];

export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );

  if (isProtected && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", path);
    return NextResponse.redirect(loginUrl);
  }

  if (path === "/login" && user) {
    return NextResponse.redirect(new URL("/overview", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|login/oauth2).*)"],
};
