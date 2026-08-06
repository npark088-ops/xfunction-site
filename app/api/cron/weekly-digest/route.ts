import { composeDigestData, sendDigestEmail } from "../../../../lib/weekly-digest";

// Triggered by Vercel Cron (see vercel.json) once a week — no signed-in
// user exists in this context, so it can't gate/consume a per-user AI
// quota the way the on-demand /api/weekly-digest route does. Kept
// data-only (grade trend + upcoming assignments, no AI coach highlight)
// so it doesn't need elevated DB access just to run a scheduled job.
//
// Sends to one fixed address (DIGEST_EMAIL) instead of fanning out to
// every registered user — Resend's onboarding@resend.dev sender can
// only deliver to the Resend account's own registered email until a
// verified sending domain is set up (same constraint documented in
// app/api/send-reminders and app/api/send-reminders-sms). Fine for a
// single-user setup like this one.
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.DIGEST_EMAIL) {
    return Response.json(
      { error: "Weekly digest isn't set up yet — DIGEST_EMAIL is missing from the server." },
      { status: 500 }
    );
  }

  const data = composeDigestData(null);
  const result = await sendDigestEmail(process.env.DIGEST_EMAIL, data);

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 500 });
  }

  return Response.json({ sent: true });
}
