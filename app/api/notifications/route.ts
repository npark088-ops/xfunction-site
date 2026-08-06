import { createClient } from "../../../lib/supabase/server";
import { getNotificationsSnapshot } from "../../../lib/notifications";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const snapshot = await getNotificationsSnapshot(supabase);
  return Response.json(snapshot);
}
