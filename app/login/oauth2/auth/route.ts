import { NextRequest, NextResponse } from "next/server";
import { issueAuthorizationCode } from "../../../../lib/mock-canvas-server-store";

// FAKE STAND-IN ONLY
// ---------------------------------------------------------------------
// This route lives at /login/oauth2/auth — the exact path real Canvas
// serves its authorization screen at. That's intentional: our client
// code (lib/canvas-oauth.ts) just hits "{CANVAS_BASE_URL}/login/oauth2/auth"
// and has no idea whether CANVAS_BASE_URL points here or at a real
// Canvas domain. Point it at instructure.com and this file becomes dead
// code you can delete; nothing else changes.
//
// Real Canvas shows a login + "Authorize XFunction to access your
// account?" consent screen here. We fake that with a plain HTML page
// (deliberately styled nothing like XFunction, so it's obvious this
// isn't a real part of the app) with Allow/Deny buttons.

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
<title>Mock Canvas — Authorize App</title>
<style>
  body { font-family: -apple-system, sans-serif; background: #f5f5f5; color: #222; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
  .card { background: white; border: 1px solid #ddd; border-radius: 8px; padding: 32px; max-width: 420px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
  .banner { background: #fef3c7; color: #92400e; padding: 8px 12px; border-radius: 6px; font-size: 13px; margin-bottom: 20px; }
  h1 { font-size: 20px; margin: 0 0 8px; }
  p { color: #555; font-size: 14px; line-height: 1.5; }
  .actions { margin-top: 24px; display: flex; gap: 12px; }
  button { flex: 1; padding: 10px 16px; border-radius: 6px; border: 1px solid #ccc; font-size: 14px; cursor: pointer; }
  .allow { background: #dc2626; color: white; border-color: #dc2626; }
  .deny { background: white; color: #333; }
</style>
</head>
<body>
  <div class="card">
    <div class="banner">⚠ Local mock Canvas — not the real canvas.instructure.com</div>
    <h1>Authorize application</h1>
    <p><strong>${escapeHtml(clientId)}</strong> is requesting access to a Canvas account. In a real flow you'd log in to Canvas first; here we skip straight to consent.</p>
    <form method="POST" action="/login/oauth2/auth">
      <input type="hidden" name="client_id" value="${escapeHtml(clientId)}" />
      <input type="hidden" name="redirect_uri" value="${escapeHtml(redirectUri)}" />
      <input type="hidden" name="state" value="${escapeHtml(state)}" />
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
  const clientId = String(formData.get("client_id") ?? "");
  const redirectUri = String(formData.get("redirect_uri") ?? "");
  const state = String(formData.get("state") ?? "");

  if (!redirectUri) {
    return new Response("Missing redirect_uri", { status: 400 });
  }

  const redirectTarget = new URL(redirectUri);

  // 303 (not the default 307) so the browser follows up with a GET —
  // this handler was reached via POST (the consent form submission),
  // but the callback route only accepts GET, same as Canvas's real one.
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
