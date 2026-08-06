import { createClient } from "../../../../lib/supabase/server";
import { markAllNotificationsRead } from "../../../../lib/notifications";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const ok = await markAllNotificationsRead(supabase);
  if (!ok) {
    return Response.json({ error: "Failed to mark notifications read" }, { status: 500 });
  }
  return Response.json({ ok: true });
}
