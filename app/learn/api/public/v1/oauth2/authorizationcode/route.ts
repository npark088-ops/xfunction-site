import { NextRequest, NextResponse } from "next/server";
import { issueAuthorizationCode } from "../../../../../../../lib/mock-blackboard-server-store";

// FAKE STAND-IN ONLY
// ---------------------------------------------------------------------
// Lives at /learn/api/public/v1/oauth2/authorizationcode — the exact
// path a real Blackboard Learn instance serves its authorization screen
// at. That's intentional: our client code (lib/blackboard-oauth.ts)
// just hits "{BLACKBOARD_BASE_URL}/learn/api/public/v1/oauth2/authorizationcode"
// and has no idea whether that env var points here or at a real Learn
// domain. Point it at a real school's Learn instance and this file
// becomes dead code you can delete; nothing else changes.
//
// Real Blackboard shows a login + "Authorize XFunction?" consent screen
// here. We fake that with a plain HTML page (deliberately styled
// nothing like XFunction or real Blackboard) with Allow/Deny buttons —
// same pattern as the Canvas/Google/Schoology mocks.

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
<title>Mock Blackboard — Authorize App</title>
<style>
  body { font-family: "Helvetica Neue", Arial, sans-serif; background: #1c1c1c; color: #eee; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
  .card { background: #2a2a2a; border: 1px solid #444; border-radius: 6px; padding: 32px; max-width: 420px; box-shadow: 0 4px 12px rgba(0,0,0,0.4); }
  .banner { background: #4a3200; color: #ffcf70; padding: 8px 12px; border-radius: 6px; font-size: 13px; margin-bottom: 20px; }
  h1 { font-size: 20px; margin: 0 0 8px; }
  p { color: #ccc; font-size: 14px; line-height: 1.5; }
  .actions { margin-top: 24px; display: flex; gap: 12px; }
  button { flex: 1; padding: 10px 16px; border-radius: 4px; border: 1px solid #555; font-size: 14px; cursor: pointer; }
  .allow { background: #ff7900; color: #1c1c1c; border-color: #ff7900; font-weight: 700; }
  .deny { background: transparent; color: #eee; }
</style>
</head>
<body>
  <div class="card">
    <div class="banner">⚠ Local mock Blackboard — not a real Learn instance</div>
    <h1>Authorize application</h1>
    <p><strong>${escapeHtml(clientId)}</strong> is requesting access to a Blackboard Learn account. In a real flow you'd log in to Learn first; here we skip straight to consent.</p>
    <form method="POST" action="/learn/api/public/v1/oauth2/authorizationcode">
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
