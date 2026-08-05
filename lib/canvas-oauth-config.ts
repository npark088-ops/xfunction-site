// REAL CANVAS-SHAPED CONFIG
// ---------------------------------------------------------------------
// Every value here is read from an environment variable. To go live
// against a real Canvas instance, set CANVAS_BASE_URL to your school's
// Canvas domain (e.g. https://yourschool.instructure.com) and
// CANVAS_CLIENT_ID / CANVAS_CLIENT_SECRET to a real Developer Key's
// credentials. Nothing in lib/canvas-oauth.ts or the /api/canvas routes
// needs to change — they only ever read config through this file.
//
// The defaults below point at our own app (the local mock Canvas
// stand-in at app/login/oauth2/*) so the flow works out of the box
// without any real credentials.
export const canvasOAuthConfig = {
  baseUrl: process.env.CANVAS_BASE_URL || "http://localhost:3000",
  clientId: process.env.CANVAS_CLIENT_ID || "mock-client-id",
  clientSecret: process.env.CANVAS_CLIENT_SECRET || "mock-client-secret",
  redirectUri:
    process.env.CANVAS_REDIRECT_URI || "http://localhost:3000/api/canvas/callback",
};
