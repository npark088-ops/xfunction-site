import { getUpcomingAssignments, URGENT_WITHIN_DAYS } from "../../../lib/upcoming-assignments";
import { createClient } from "../../../lib/supabase/server";

function daysAwayLabel(daysAway: number) {
  if (daysAway <= 0) return "due today";
  if (daysAway === 1) return "due tomorrow";
  return `due in ${daysAway} days`;
}

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return Response.json(
      { error: "Email sending isn't set up yet — RESEND_API_KEY is missing from the server." },
      { status: 500 }
    );
  }

  const urgent = getUpcomingAssignments(URGENT_WITHIN_DAYS);

  if (urgent.length === 0) {
    return Response.json({ sent: false, count: 0 });
  }

  const listItemsHtml = urgent
    .map(
      (a) =>
        `<li><strong>${a.courseName}</strong> — ${a.assignmentName} (${daysAwayLabel(a.daysAway)})</li>`
    )
    .join("");

  try {
    // Sends via onboarding@resend.dev, Resend's shared test sender —
    // it can only deliver to the email address your Resend account
    // itself is registered under. That's fine for a single-user dev
    // setup like this one; sending to arbitrary students later would
    // need a verified sending domain in Resend.
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "xFunction <onboarding@resend.dev>",
        to: user.email,
        subject: `${urgent.length} deadline${urgent.length === 1 ? "" : "s"} coming up`,
        html: `<h2>Upcoming deadlines</h2><ul>${listItemsHtml}</ul>`,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("Resend send failed:", res.status, body);
      return Response.json({ error: "Failed to send reminder email" }, { status: 500 });
    }

    return Response.json({ sent: true, count: urgent.length });
  } catch (error) {
    console.error("Reminder email failed:", error);
    return Response.json({ error: "Failed to send reminder email" }, { status: 500 });
  }
}
