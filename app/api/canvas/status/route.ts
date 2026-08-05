import { getCanvasConnection } from "../../../../lib/canvas-token-store";
import { createClient } from "../../../../lib/supabase/server";

// This endpoint is ours, not Canvas's — a real backend-for-frontend
// would expose something like this so the client can ask "are we
// connected" without ever handling the access token directly.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ connected: false, user: null });
  }

  const connection = await getCanvasConnection(supabase, user.id);

  return Response.json({
    connected: Boolean(connection),
    user: connection ? { id: connection.canvas_user_id, name: connection.canvas_user_name } : null,
  });
}
