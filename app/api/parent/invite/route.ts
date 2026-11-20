import { createClient } from "../../../../lib/supabase/server";
import { createParentInvite } from "../../../../lib/parent-server";

// A student creates a parent invite. The code is made on the server, only its
// hash is stored, and the code comes back ONCE in this response (it can't be
// shown again). Pending invites expire after 7 days and work once.
export async function POST(req: Request) {
  const supabase = await createClient();
  const result = await createParentInvite(supabase, new URL(req.url).origin);

  if (!result.ok) {
    return Response.json({ error: result.message }, { status: result.status, headers: { "Cache-Control": "no-store" } });
  }
  return Response.json(
    { link: result.link, expiresAt: result.expiresAt },
    { headers: { "Cache-Control": "no-store" } }
  );
}
