import { NextRequest } from "next/server";
import { moodleAuthConfig } from "../../../lib/moodle-auth-config";
import { issueTokenForCredentials } from "../../../lib/mock-moodle-server-store";
import { MoodleTokenResponse, MoodleTokenError } from "../../../lib/moodle-types";

// FAKE STAND-IN ONLY
// ---------------------------------------------------------------------
// Lives at /login/token.php — the exact path every real Moodle site
// serves its web service login at (Moodle's REST endpoints are
// literally named with a .php extension, unlike the other platforms'
// mocks — Next.js is fine with a folder literally named "token.php").
// Our client code (lib/moodle-auth.ts) builds this path against
// whatever site URL the student entered (see app/connect/moodle), so
// pointing that field at a real Moodle domain talks to the real thing;
// this file only exists to answer requests aimed at our own origin.
//
// Real Moodle responds 200 OK even for a bad login, with an
// `error`/`errorcode` body instead of an HTTP error status — same shape
// reproduced here.
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const service = String(formData.get("service") ?? "");

  if (service !== moodleAuthConfig.serviceShortName) {
    const error: MoodleTokenError = {
      error: "Invalid service",
      errorcode: "invalidtoken",
    };
    return Response.json(error);
  }

  const token = issueTokenForCredentials(username, password);
  if (!token) {
    const error: MoodleTokenError = {
      error: "Invalid login, please try again",
      errorcode: "invalidlogin",
    };
    return Response.json(error);
  }

  const tokenResponse: MoodleTokenResponse = { token };
  return Response.json(tokenResponse);
}
