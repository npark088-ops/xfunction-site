// Text-message reminders are NOT available yet, and this route does nothing.
//
// The old version sent every student's reminder to ONE fixed phone number from
// the server settings (REMINDER_PHONE_NUMBER), because no per-student phone
// number is stored anywhere. That meant texting the wrong person, so it is
// switched off. A real version needs: a phone-number field the student fills in
// and confirms, consent to be texted, and a Twilio sender that is allowed to
// reach arbitrary numbers. Until then this answers "disabled" and sends nothing.
export async function POST() {
  return Response.json({
    sent: false,
    count: 0,
    disabled: true,
    message: "Text reminders aren't available yet.",
  });
}
