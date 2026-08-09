import { NextRequest, NextResponse } from "next/server";
import { authorizeRequestToken } from "../../../lib/mock-schoology-server-store";

// FAKE STAND-IN ONLY
// ---------------------------------------------------------------------
// Lives at /oauth/authorize — the exact path real Schoology serves its
// user-facing consent screen at (https://app.schoology.com/oauth/authorize).
// Step 2 of the three-legged OAuth1 flow. Real Schoology shows a login +
// "Allow XFunction to access your Schoology account?" screen here. We
// fake that with a plain HTML page (deliberately styled nothing like
// XFunction or real Schoology) with Allow/Deny buttons — same pattern as
// the Canvas and Google mocks.
//
// Unlike Canvas/Google's mock consent screens, this one doesn't get
// redirect_uri as a query param — Schoology's flow only ever knows the
// callback URL that was registered when the request token was issued
// (see /v1/oauth/request_token), so the redirect target comes from the
// mock server's own record of that token, not from anything the browser
// passes in here.

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET(request: NextRequest) {
  const oauthToken = request.nextUrl.searchParams.get("oauth_token") ?? "";

  if (!oauthToken) {
    return new Response("Missing oauth_token", { status: 400 });
  }

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Mock Schoology — Authorize App</title>
<style>
  body { font-family: Helvetica, Arial, sans-serif; background: #eef1f4; color: #1c2b39; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
  .card { background: white; border: 1px solid #d6dee5; border-radius: 8px; padding: 32px; max-width: 420px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
  .banner { background: #fdecea; color: #a13a2f; padding: 8px 12px; border-radius: 6px; font-size: 13px; margin-bottom: 20px; }
  h1 { font-size: 20px; margin: 0 0 8px; }
  p { color: #55636e; font-size: 14px; line-height: 1.5; }
  .actions { margin-top: 24px; display: flex; gap: 12px; }
  button { flex: 1; padding: 10px 16px; border-radius: 6px; border: 1px solid #ccc; font-size: 14px; cursor: pointer; }
  .allow { background: #d5202c; color: white; border-color: #d5202c; }
  .deny { background: white; color: #333; }
</style>
</head>
<body>
  <div class="card">
    <div class="banner">⚠ Local mock Schoology — not the real app.schoology.com</div>
    <h1>Authorize application</h1>
    <p>XFunction is requesting access to a Schoology account's courses and grades. In a real flow you'd log in to Schoology first; here we skip straight to consent.</p>
    <form method="POST" action="/oauth/authorize">
      <input type="hidden" name="oauth_token" value="${escapeHtml(oauthToken)}" />
      <div class="actions">
        <button class="deny" name="decision" value="deny" type="submit">Cancel</button>
        <button class="allow" name="decision" value="allow" type="submit">Authorize</button>
      </div>
    </form>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const decision = formData.get("decision");
  const oauthToken = String(formData.get("oauth_token") ?? "");

  if (!oauthToken) {
    return new Response("Missing oauth_token", { status: 400 });
  }

  const callbackUrl = authorizeRequestToken(oauthToken);
  if (!callbackUrl) {
    return new Response("Unknown or expired request token", { status: 400 });
  }

  const redirectTarget = new URL(callbackUrl);

  // 303 so the browser follows up with a GET.
  if (decision !== "allow") {
    redirectTarget.searchParams.set("error", "access_denied");
    return NextResponse.redirect(redirectTarget, 303);
  }

  // Real Schoology's simplified 3-legged flow redirects back with just
  // oauth_token — no oauth_verifier, unlike strict RFC 5849.
  redirectTarget.searchParams.set("oauth_token", oauthToken);
  return NextResponse.redirect(redirectTarget, 303);
}
