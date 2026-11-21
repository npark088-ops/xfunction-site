import { createClient } from "../../../../lib/supabase/server";
import { acceptParentInvite } from "../../../../lib/parent-server";

// A parent accepts an invite. The database claims it in one atomic step: the
// code must be pending, unexpired and unused; it works once; and wrong codes
// are limited per signed-in user (5 an hour, then everything is refused).
export async function POST(req: Request) {
  const raw = await req.text();
  let code: unknown;
  try {
    code = raw.length <= 2000 ? JSON.parse(raw)?.code : undefined;
  } catch {
    code = undefined;
  }

  const supabase = await createClient();
  const result = await acceptParentInvite(supabase, code);
  if (!result.ok) {
    return Response.json(
      { error: result.outcome.code, message: result.outcome.message },
      { status: result.outcome.status, headers: { "Cache-Control": "no-store" } }
    );
  }
  return Response.json({ ok: true, maskedEmail: result.maskedEmail }, { headers: { "Cache-Control": "no-store" } });
}
