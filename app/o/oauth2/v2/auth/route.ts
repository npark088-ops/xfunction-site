import { NextRequest, NextResponse } from "next/server";
import { issueAuthorizationCode } from "../../../../../lib/mock-google-server-store";

// FAKE STAND-IN ONLY
// ---------------------------------------------------------------------
// Lives at /o/oauth2/v2/auth — the exact path real Google serves its
// authorization screen at. That's intentional: our client code
// (lib/google-classroom-oauth.ts) just hits
// "{GOOGLE_OAUTH_AUTH_BASE_URL}/o/oauth2/v2/auth" and has no idea
// whether that env var points here or at accounts.google.com. Point it
// at Google's real host and this file becomes dead code you can delete;
// nothing else changes.
//
// Real Google shows a Google Account picker + "XFunction wants to
// access your Google Account" consent screen here. We fake that with a
// plain HTML page (deliberately styled nothing like XFunction or real
// Google, so it's obvious this isn't the real thing) with Allow/Deny
// buttons — same pattern as app/login/oauth2/auth (Canvas's mock).

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const clientId = params.get("client_id") ?? "";
  const redirectUri = params.get("redirect_uri") ?? "";
  const state = params.get("state") ?? "";
  const responseType = params.get("response_type") ?? "";

  if (!clientId || !redirectUri || responseType !== "code") {
    return new Response("Missing or invalid OAuth parameters", { status: 400 });
  }

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Mock Google — Sign in</title>
<style>
  body { font-family: Roboto, Arial, sans-serif; background: #f8f9fa; color: #202124; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
  .card { background: white; border: 1px solid #dadce0; border-radius: 8px; padding: 32px; max-width: 420px; box-shadow: 0 1px 3px rgba(0,0,0,0.12); }
  .banner { background: #fef7e0; color: #b06000; padding: 8px 12px; border-radius: 6px; font-size: 13px; margin-bottom: 20px; }
  h1 { font-size: 20px; margin: 0 0 8px; }
  p { color: #5f6368; font-size: 14px; line-height: 1.5; }
  .actions { margin-top: 24px; display: flex; gap: 12px; }
  button { flex: 1; padding: 10px 16px; border-radius: 6px; border: 1px solid #dadce0; font-size: 14px; cursor: pointer; }
  .allow { background: #1a73e8; color: white; border-color: #1a73e8; }
  .deny { background: white; color: #3c4043; }
</style>
</head>
<body>
  <div class="card">
    <div class="banner">⚠ Local mock Google — not the real accounts.google.com</div>
    <h1>Sign in with Google</h1>
    <p><strong>${escapeHtml(clientId)}</strong> wants to access your Google Classroom courses and coursework. In a real flow you'd pick a Google Account first; here we skip straight to consent.</p>
    <form method="POST" action="/o/oauth2/v2/auth">
      <input type="hidden" name="client_id" value="${escapeHtml(clientId)}" />
      <input type="hidden" name="redirect_uri" value="${escapeHtml(redirectUri)}" />
      <input type="hidden" name="state" value="${escapeHtml(state)}" />
      <div class="actions">
        <button class="deny" name="decision" value="deny" type="submit">Cancel</button>
        <button class="allow" name="decision" value="allow" type="submit">Allow</button>
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
  const clientId = String(formData.get("client_id") ?? "");
  const redirectUri = String(formData.get("redirect_uri") ?? "");
  const state = String(formData.get("state") ?? "");

  if (!redirectUri) {
    return new Response("Missing redirect_uri", { status: 400 });
  }

  const redirectTarget = new URL(redirectUri);

  // 303 so the browser follows up with a GET — this handler was reached
  // via POST (the consent form submission), but the callback route only
  // accepts GET, same as Google's real one.
  if (decision !== "allow") {
    redirectTarget.searchParams.set("error", "access_denied");
    if (state) redirectTarget.searchParams.set("state", state);
    return NextResponse.redirect(redirectTarget, 303);
  }

  const code = issueAuthorizationCode(clientId, redirectUri);
  redirectTarget.searchParams.set("code", code);
  if (state) redirectTarget.searchParams.set("state", state);

  return NextResponse.redirect(redirectTarget, 303);
}
