// Where the support chat (see app/api/support-chat) tells students to
// email when a question is genuinely beyond what it can resolve —
// billing disputes, refund requests, or a bug that needs an actual code
// fix rather than a troubleshooting step. This app doesn't have a real
// monitored support inbox set up yet (email sending elsewhere in the
// app goes through Resend's shared onboarding@resend.dev test sender —
// see lib/onboarding-emails.ts), so this is a placeholder: swap it for
// a real, monitored address before this app has real users depending
// on it.
export const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "support@xfunction.app";
