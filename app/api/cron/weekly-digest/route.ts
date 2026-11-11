// Triggered by Vercel Cron (see vercel.json) once a week — no signed-in
// user exists in this context, so it can't gate/consume a per-user AI
// quota the way the on-demand /api/weekly-digest route does.
//
// DISABLED as of real per-user course data (see lib/user-courses.ts):
// this used to compose a digest from the single shared mockCourses
// dataset and send it to one fixed DIGEST_EMAIL address — safe when
// every account showed the same numbers anyway. Now that grades are
// genuinely per-user, sending "a" digest to DIGEST_EMAIL would mean
// either fabricating data or arbitrarily picking one account's real
// grades to email to a fixed address, both worse than not sending.
// Re-enabling this needs a service-role client + a real way to resolve
// "which account does DIGEST_EMAIL belong to" (or a proper per-user
// fan-out, which Resend's sandboxed onboarding@resend.dev sender can't
// do anyway until a verified sending domain is set up — same
// constraint documented in app/api/send-reminders) — out of scope here.
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return Response.json(
    {
      error:
        "Weekly digest cron is disabled pending per-user account resolution — see the comment in this route's source.",
    },
    { status: 501 }
  );
}
