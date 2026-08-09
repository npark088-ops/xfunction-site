import { NextRequest } from "next/server";
import { requestMoodleToken, getMoodleSiteInfo } from "../../../../lib/moodle-auth";
import { saveMoodleToken } from "../../../../lib/moodle-token-store";
import { createClient } from "../../../../lib/supabase/server";

// REAL MOODLE-SHAPED LOGIC
// ---------------------------------------------------------------------
// Unlike the other platforms' /connect routes (which redirect the
// browser offsite), this one is a normal JSON API called from
// app/connect/moodle/page.tsx's form submit — because Moodle's real
// flow has no redirect step to send the browser to in the first place
// (see lib/moodle-auth.ts). This is the point where the student's own
// Moodle credentials actually get exchanged for a token and the
// connection gets saved against the signed-in XFunction user.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ message: "Not signed in." }, { status: 401 });
  }

  const { siteUrl, username, password } = await request.json();
  if (!siteUrl || !username || !password) {
    return Response.json({ message: "Site URL, username, and password are all required." }, { status: 400 });
  }

  try {
    const token = await requestMoodleToken(siteUrl, username, password);
    const siteInfo = await getMoodleSiteInfo(siteUrl, token.token);
    await saveMoodleToken(supabase, user.id, siteUrl, token, siteInfo);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("Moodle connect failed:", err);
    const message = err instanceof Error ? err.message : "Failed to connect to Moodle.";
    return Response.json({ message }, { status: 400 });
  }
}
