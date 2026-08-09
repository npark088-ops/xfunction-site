// REAL GOOGLE-SHAPED CONFIG
// ---------------------------------------------------------------------
// Every value here is read from an environment variable. To go live
// against real Google Classroom, register an OAuth client in Google
// Cloud Console, then set GOOGLE_OAUTH_AUTH_BASE_URL to
// "https://accounts.google.com", GOOGLE_OAUTH_TOKEN_BASE_URL to
// "https://oauth2.googleapis.com", and GOOGLE_CLASSROOM_CLIENT_ID /
// GOOGLE_CLASSROOM_CLIENT_SECRET to that client's credentials. Nothing
// in lib/google-classroom-oauth.ts or the /api/google-classroom routes
// needs to change — they only ever read config through this file.
//
// Google genuinely serves its authorization screen and token endpoint on
// two different hosts (accounts.google.com vs oauth2.googleapis.com),
// unlike Canvas's single baseUrl — both default to our own app (the
// local mock stand-in at app/o/oauth2/v2/auth and app/token) so the flow
// works out of the box without real credentials.
export const googleClassroomOAuthConfig = {
  authBaseUrl: process.env.GOOGLE_OAUTH_AUTH_BASE_URL || "http://localhost:3000",
  tokenBaseUrl: process.env.GOOGLE_OAUTH_TOKEN_BASE_URL || "http://localhost:3000",
  clientId: process.env.GOOGLE_CLASSROOM_CLIENT_ID || "mock-google-client-id",
  clientSecret: process.env.GOOGLE_CLASSROOM_CLIENT_SECRET || "mock-google-client-secret",
  redirectUri:
    process.env.GOOGLE_CLASSROOM_REDIRECT_URI ||
    "http://localhost:3000/api/google-classroom/callback",
};
