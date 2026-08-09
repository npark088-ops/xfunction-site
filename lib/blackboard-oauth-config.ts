// REAL BLACKBOARD-SHAPED CONFIG
// ---------------------------------------------------------------------
// Every value here is read from an environment variable. To go live
// against a real Blackboard Learn instance, register a REST API
// integration in that school's Blackboard admin panel (Integrations →
// REST API Integrations), then set BLACKBOARD_BASE_URL to the school's
// Learn domain (e.g. https://blackboard.yourschool.edu) and
// BLACKBOARD_CLIENT_ID / BLACKBOARD_CLIENT_SECRET to that integration's
// credentials. Nothing in lib/blackboard-oauth.ts or the /api/blackboard
// routes needs to change — they only ever read config through this file.
//
// Same "every school self-hosts their own instance" reality as Canvas —
// kept as a single configured base URL (not a per-user site URL the way
// Moodle needs) for the same reason Canvas is: simplest to demo, and a
// student's own school already knows which Learn domain the app talks
// to. The defaults below point at our own app (the local mock stand-in
// at app/learn/api/public/v1/oauth2/*) so the flow works out of the box
// without real credentials.
export const blackboardOAuthConfig = {
  baseUrl: process.env.BLACKBOARD_BASE_URL || "http://localhost:3000",
  clientId: process.env.BLACKBOARD_CLIENT_ID || "mock-blackboard-client-id",
  clientSecret: process.env.BLACKBOARD_CLIENT_SECRET || "mock-blackboard-client-secret",
  redirectUri:
    process.env.BLACKBOARD_REDIRECT_URI || "http://localhost:3000/api/blackboard/callback",
};
