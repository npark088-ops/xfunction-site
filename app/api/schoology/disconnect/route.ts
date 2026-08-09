import { clearSchoologyToken } from "../../../../lib/schoology-token-store";
import { createClient } from "../../../../lib/supabase/server";

// Ours, not Schoology's — for now this just removes our stored copy for
// the signed-in user, same as /api/canvas/disconnect.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ connected: false }, { status: 401 });
  }

  await clearSchoologyToken(supabase, user.id);
  return Response.json({ connected: false });
}
