// Outgoing email (reminders, onboarding emails, the weekly digest) is OFF
// until a verified sending address is configured.
//
// Why: the old sender, onboarding@resend.dev, is Resend's shared test address.
// It can only deliver to the one inbox the Resend account is registered under,
// so for real students every send either failed or went nowhere useful. Until
// a domain is verified in Resend, email features now quietly do nothing instead
// of erroring.
//
// To turn email on (server environment variables, set in your host; they are
// NOT set in the code):
//   RESEND_API_KEY   your Resend API key (already used)
//   EMAIL_FROM       the verified sender, e.g.  XFunction <hello@yourdomain.com>
// Both must be present. Documented in README.md ("Environment variables").

export function getEmailSender(): string | null {
  const from = process.env.EMAIL_FROM?.trim();
  return from ? from : null;
}

export function emailSendingEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY) && getEmailSender() !== null;
}

// Shown (or returned in JSON) wherever email is skipped.
export const EMAIL_DISABLED_MESSAGE = "Email isn't switched on yet. This will start working once a sending address is set up.";
