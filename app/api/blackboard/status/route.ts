import { getBlackboardConnection } from "../../../../lib/blackboard-token-store";
import { createClient } from "../../../../lib/supabase/server";

// This endpoint is ours, not Blackboard's — same as /api/canvas/status.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ connected: false, user: null });
  }

  const connection = await getBlackboardConnection(supabase, user.id);

  return Response.json({
    connected: Boolean(connection),
    user: connection
      ? { id: connection.blackboard_user_id, name: connection.blackboard_user_name }
      : null,
  });
}
