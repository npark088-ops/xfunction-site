import { createClient } from "../../../lib/supabase/server";
import { recordDailyVisit } from "../../../lib/profile-server";
import { getRequestTimeZone } from "../../../lib/request-tz";

// Called once per /app visit. Bumps the streak the first time a user
// shows up on a given calendar day, resets it if a day was missed, and
// is a no-op on repeat visits within the same day (so refreshing /app
// doesn't re-trigger the increment or the celebration animation).
//
// The streak columns can't be written by a signed-in user's own session, so
// the logic lives in lib/profile-server.ts (recordDailyVisit): it verifies
// the user from the session, then writes with the admin client.
export async function POST() {
  const supabase = await createClient();
  const result = await recordDailyVisit(supabase, await getRequestTimeZone());

  if (!result) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  return Response.json(result);
}
