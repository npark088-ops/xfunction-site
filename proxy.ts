import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Next.js 16 renamed Middleware to Proxy (same mechanism, new name/file).
// This runs on every request (see matcher below) to:
//   1. Refresh the Supabase session cookie, so it doesn't silently expire.
//   2. Gate the signed-in parts of the app (/today, /overview, /ask,
//      /courses, /compare, /search, /schedule, /trends, /tasks, /grades,
//      /settings, /parent, /connect (Moodle's credential-collection
//      page — see app/connect/moodle) — /app is a compat redirect to
//      /overview) behind auth, redirecting to /login when there's no
//      session.
//   3. Redirect an already-signed-in user away from /login.
//
// This is an "optimistic" check (cookie-only, no DB round trip) per
// Next.js's auth guidance — real authorization for data access still
// happens at the database via Row Level Security policies.
//
// Deliberately NOT protected: the mock provider stand-in pages
// (/login/oauth2/*, /o/oauth2/v2/auth, /token, /oauth/authorize,
// /v1/oauth/*, /v1/users/me, /login/token.php, /webservice/rest/server.php,
// /learn/api/public/v1/*) — those play the role of Canvas/Google/
// Schoology/Moodle/Blackboard's OWN servers, which obviously don't
// check for an XFunction session.

const PROTECTED_PREFIXES = ["/app", "/today", "/overview", "/ask", "/courses", "/compare", "/search", "/schedule", "/trends", "/tasks", "/grades", "/settings", "/parent", "/connect"];

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
    // Keep the query string too — /parent/join?code=ABC123 must survive
    // login/signup, or a logged-out parent lands on "Missing invite code".
    loginUrl.searchParams.set("next", path + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  if (path === "/login" && user) {
    return NextResponse.redirect(new URL("/today", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|login/oauth2).*)"],
};
