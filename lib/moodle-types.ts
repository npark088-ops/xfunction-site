// Types matching the real Moodle Web Services API response shapes.
// Docs: https://docs.moodle.org/dev/Web_service_API_functions
//       https://docs.moodle.org/dev/Creating_a_web_service_client
// Keeping these accurate means swapping mock data for real API calls
// later requires zero changes to UI logic downstream.

// Response shape from POST {siteUrl}/login/token.php
export interface MoodleTokenResponse {
  token: string;
  // Only present when the site has "Enable privatetoken" turned on
  // (mostly used by Moodle's own official mobile app for auto-login
  // links) — most external clients only ever see `token`.
  privatetoken?: string;
}

// Moodle returns 200 OK with an error BODY, not an HTTP error status,
// for a bad login — same shape login/token.php actually uses.
export interface MoodleTokenError {
  error: string;
  errorcode: string;
}

// Response shape from {siteUrl}/webservice/rest/server.php
// ?wsfunction=core_webservice_get_site_info — the standard "who am I"
// call every Moodle web service client makes right after getting a
// token, since (like Schoology) the token endpoint itself doesn't
// return the user's name.
export interface MoodleSiteInfo {
  userid: number;
  fullname: string;
  sitename: string;
  siteurl: string;
}
