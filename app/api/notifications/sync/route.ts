import { createClient } from "../../../../lib/supabase/server";
import { syncActivityNotifications } from "../../../../lib/activity-notifications";

// Fired once per visit from the Overview page (the natural "check the
// dashboard" landing spot) instead of running on every dashboard
// navigation — see lib/activity-notifications.ts for why this moved
// out of the shared layout.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  await syncActivityNotifications(supabase, user.id);
  return Response.json({ ok: true });
}
