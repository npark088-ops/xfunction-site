import { NextRequest } from "next/server";
import { getTokenInfo } from "../../../../lib/mock-moodle-server-store";
import { MoodleSiteInfo } from "../../../../lib/moodle-types";

// FAKE STAND-IN ONLY
// ---------------------------------------------------------------------
// Lives at /webservice/rest/server.php — the exact path every real
// Moodle site serves ALL of its web service functions at (one shared
// endpoint, with `wsfunction` picking which call you're making — real
// Moodle sites expose dozens of wsfunctions; this mock only implements
// the one lib/moodle-auth.ts actually calls).
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const token = params.get("wstoken") ?? "";
  const wsfunction = params.get("wsfunction") ?? "";

  const info = getTokenInfo(token);
  if (!info) {
    return Response.json({
      exception: "webservice_access_exception",
      message: "Invalid token - token not found",
    });
  }

  if (wsfunction !== "core_webservice_get_site_info") {
    return Response.json({
      exception: "webservice_access_exception",
      message: `wsfunction '${wsfunction}' not implemented in this mock`,
    });
  }

  const siteInfo: MoodleSiteInfo = {
    userid: info.userId,
    fullname: info.fullName,
    sitename: "Mock Moodle (local stand-in)",
    siteurl: "http://localhost:3000",
  };
  return Response.json(siteInfo);
}
