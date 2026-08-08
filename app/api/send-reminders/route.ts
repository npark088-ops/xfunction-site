import { getUpcomingAssignments, getDigestAssignments, URGENT_WITHIN_DAYS } from "../../../lib/upcoming-assignments";
import { createClient } from "../../../lib/supabase/server";

function daysAwayLabel(daysAway: number) {
  if (daysAway <= 0) return "due today";
  if (daysAway === 1) return "due tomorrow";
  return `due in ${daysAway} days`;
}

// Two tiers in one email rather than one line per assignment regardless
// of urgency: genuinely urgent items (due within URGENT_WITHIN_DAYS)
// stay listed individually since each one matters on its own, while
// everything else due this week gets folded into a single batched
// paragraph — same split as the in-app notifications (see
// lib/activity-notifications.ts), just rendered as one email instead of
// separate notification rows.
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
  const digestItems = getDigestAssignments();
  const totalCount = urgent.length + digestItems.length;

  if (totalCount === 0) {
    return Response.json({ sent: false, count: 0 });
  }

  const urgentHtml =
    urgent.length > 0
      ? `<h2>Due soon</h2><ul>${urgent
          .map(
            (a) =>
              `<li><strong>${a.courseName}</strong> — ${a.assignmentName} (${daysAwayLabel(a.daysAway)})</li>`
          )
          .join("")}</ul>`
      : "";

  const digestHtml =
    digestItems.length > 0
      ? `<h2>Later this week</h2><p>${digestItems.length} more assignment${digestItems.length === 1 ? "" : "s"} coming up: ${digestItems
          .map((a) => `${a.assignmentName} (${a.courseName})`)
          .join(", ")}.</p>`
      : "";

  const subject =
    urgent.length > 0
      ? `${urgent.length} deadline${urgent.length === 1 ? "" : "s"} coming up`
      : `${digestItems.length} assignment${digestItems.length === 1 ? "" : "s"} due later this week`;

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
        from: "XFunction <onboarding@resend.dev>",
        to: user.email,
        subject,
        html: `${urgentHtml}${digestHtml}`,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("Resend send failed:", res.status, body);
      return Response.json({ error: "Failed to send reminder email" }, { status: 500 });
    }

    return Response.json({ sent: true, count: totalCount });
  } catch (error) {
    console.error("Reminder email failed:", error);
    return Response.json({ error: "Failed to send reminder email" }, { status: 500 });
  }
}
