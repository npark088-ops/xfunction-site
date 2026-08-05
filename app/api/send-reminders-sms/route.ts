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

  if (!user) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, REMINDER_PHONE_NUMBER } =
    process.env;

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER || !REMINDER_PHONE_NUMBER) {
    return Response.json(
      { error: "Text sending isn't set up yet — Twilio env vars are missing from the server." },
      { status: 500 }
    );
  }

  const urgent = getUpcomingAssignments(URGENT_WITHIN_DAYS);

  if (urgent.length === 0) {
    return Response.json({ sent: false, count: 0 });
  }

  const body = [
    `${urgent.length} deadline${urgent.length === 1 ? "" : "s"} coming up:`,
    ...urgent.map((a) => `• ${a.courseName} — ${a.assignmentName} (${daysAwayLabel(a.daysAway)})`),
  ].join("\n");

  try {
    // Single-user setup for now, same reasoning as the Resend sender
    // restriction: a trial Twilio account can only text numbers
    // verified under Verified Caller IDs, and there's no per-user
    // phone number stored yet — REMINDER_PHONE_NUMBER is a fixed
    // destination, not the signed-in user's own number.
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: REMINDER_PHONE_NUMBER,
          From: TWILIO_PHONE_NUMBER,
          Body: body,
        }),
      }
    );

    if (!res.ok) {
      const responseBody = await res.text();
      console.error("Twilio send failed:", res.status, responseBody);
      return Response.json({ error: "Failed to send reminder text" }, { status: 500 });
    }

    return Response.json({ sent: true, count: urgent.length });
  } catch (error) {
    console.error("Reminder text failed:", error);
    return Response.json({ error: "Failed to send reminder text" }, { status: 500 });
  }
}
