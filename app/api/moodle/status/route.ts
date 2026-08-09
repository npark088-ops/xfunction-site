import { getMoodleConnection } from "../../../../lib/moodle-token-store";
import { createClient } from "../../../../lib/supabase/server";

// This endpoint is ours, not Moodle's — same as /api/canvas/status.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ connected: false, user: null });
  }

  const connection = await getMoodleConnection(supabase, user.id);

  return Response.json({
    connected: Boolean(connection),
    user: connection ? { id: connection.moodle_user_id, name: connection.moodle_user_name } : null,
  });
}
