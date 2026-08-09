import { moodleAuthConfig } from "./moodle-auth-config";
import { MoodleTokenResponse, MoodleTokenError, MoodleSiteInfo } from "./moodle-types";

// REAL MOODLE-SHAPED LOGIC
// ---------------------------------------------------------------------
// This file implements Moodle's actual documented web-service client
// pattern, nothing invented:
// https://docs.moodle.org/dev/Creating_a_web_service_client
//
// This is deliberately NOT an OAuth2/OAuth1 redirect flow — Moodle's
// standard third-party integration path is a direct credential
// exchange: the client app collects the student's own Moodle username
// and password itself (see app/connect/moodle/page.tsx) and trades them
// for a web service token, rather than redirecting to a Moodle-hosted
// consent screen the way Canvas/Google/Schoology/Blackboard do. That's
// a real, meaningful difference in how Moodle integrations work, not a
// corner we cut.
//
//   1. POST {siteUrl}/login/token.php with username, password, and a
//      registered "service" shortname. Returns a `token` (or an error
//      body — Moodle returns 200 OK even for bad logins, with an
//      `error`/`errorcode` field instead of an HTTP error status).
//   2. Call {siteUrl}/webservice/rest/server.php with
//      wsfunction=core_webservice_get_site_info to find out who the
//      token belongs to (Moodle's token response has no user info in it).
//
// Every URL here is built from the site URL the student provided plus
// moodleAuthConfig's service shortname. Point siteUrl at a real Moodle
// instance with that service enabled, and this exact code talks to the
// real Moodle API — no logic changes required. (Today it points at our
// local mock stand-in — see app/login/token.php and
// app/webservice/rest/server.php.)

export async function requestMoodleToken(
  siteUrl: string,
  username: string,
  password: string
): Promise<MoodleTokenResponse> {
  const url = new URL("/login/token.php", siteUrl);

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      username,
      password,
      service: moodleAuthConfig.serviceShortName,
    }),
    cache: "no-store",
  });

  const data: MoodleTokenResponse | MoodleTokenError = await response.json();
  if ("error" in data) {
    throw new Error(data.error);
  }
  return data;
}

export async function getMoodleSiteInfo(siteUrl: string, token: string): Promise<MoodleSiteInfo> {
  const url = new URL("/webservice/rest/server.php", siteUrl);
  url.searchParams.set("wstoken", token);
  url.searchParams.set("wsfunction", "core_webservice_get_site_info");
  url.searchParams.set("moodlewsrestformat", "json");

  const response = await fetch(url.toString(), { cache: "no-store" });
  const data = await response.json();
  if (data?.exception) {
    throw new Error(data.message || "Moodle site info request failed");
  }
  return data;
}
