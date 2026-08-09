// REAL SCHOOLOGY-SHAPED CONFIG
// ---------------------------------------------------------------------
// Every value here is read from an environment variable. To go live
// against real Schoology, register an API key/secret pair in your
// school's Schoology admin (App Center → API), then set
// SCHOOLOGY_API_BASE_URL to "https://api.schoology.com/v1",
// SCHOOLOGY_APP_BASE_URL to "https://app.schoology.com", and
// SCHOOLOGY_CONSUMER_KEY / SCHOOLOGY_CONSUMER_SECRET to that pair's
// credentials. Nothing in lib/schoology-oauth.ts or the /api/schoology
// routes needs to change — they only ever read config through this file.
//
// Schoology genuinely serves its API (request_token, access_token,
// users/me) and its user-facing authorize screen on two different hosts
// (api.schoology.com vs app.schoology.com), same reason Google needs two
// base URLs — both default to our own app (the local mock stand-in at
// app/v1/oauth/* and app/oauth/authorize) so the flow works out of the
// box without real credentials.
//
// Unlike Canvas/Google's OAuth2 client_id+client_secret, Schoology's API
// uses OAuth 1.0a: a "consumer key/secret" pair signs every request
// (see lib/oauth1-signing.ts) instead of presenting a bearer token.
export const schoologyOAuthConfig = {
  apiBaseUrl: process.env.SCHOOLOGY_API_BASE_URL || "http://localhost:3000",
  appBaseUrl: process.env.SCHOOLOGY_APP_BASE_URL || "http://localhost:3000",
  consumerKey: process.env.SCHOOLOGY_CONSUMER_KEY || "mock-schoology-consumer-key",
  consumerSecret: process.env.SCHOOLOGY_CONSUMER_SECRET || "mock-schoology-consumer-secret",
  callbackUrl:
    process.env.SCHOOLOGY_CALLBACK_URL || "http://localhost:3000/api/schoology/callback",
};
