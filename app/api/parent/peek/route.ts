import { createClient } from "../../../../lib/supabase/server";
import { peekParentInvite } from "../../../../lib/parent-server";

// "You're about to link to j***@gmail.com": checks a code without using it.
// The student's email is masked here; the full address never reaches the
// browser. Wrong codes count against the signed-in user's limit (5 an hour).
export async function POST(req: Request) {
  const raw = await req.text();
  let code: unknown;
  try {
    code = raw.length <= 2000 ? JSON.parse(raw)?.code : undefined;
  } catch {
    code = undefined;
  }

  const supabase = await createClient();
  const result = await peekParentInvite(supabase, code);
  if (!result.ok) {
    return Response.json(
      { error: result.outcome.code, message: result.outcome.message },
      { status: result.outcome.status, headers: { "Cache-Control": "no-store" } }
    );
  }
  return Response.json({ maskedEmail: result.maskedEmail }, { headers: { "Cache-Control": "no-store" } });
}
