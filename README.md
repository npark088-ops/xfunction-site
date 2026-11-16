This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Environment variables for email and support

These are read on the server only. Set them in your host's environment settings (and `.env.local` for local development). The code never sets them, and nothing here is a secret except `RESEND_API_KEY`.

| Variable | What it does | If it is missing |
| --- | --- | --- |
| `RESEND_API_KEY` | Your Resend API key, used to send email. | Email is off. |
| `EMAIL_FROM` | The verified sender address, written the way email clients show it, for example `XFunction <hello@yourdomain.com>`. The domain must be verified in Resend. | Email is off. |

**Email is off until both `RESEND_API_KEY` and `EMAIL_FROM` are set.** While it is off, the reminder email button, the weekly digest button, the welcome email and the daily onboarding-email job all do nothing and report "not switched on yet" (no errors, and nobody is marked as already emailed). Resend's shared `onboarding@resend.dev` test address is no longer used, because it can only reach the Resend account owner.

Text-message reminders are switched off entirely (there is no per-student phone number yet), so no Twilio variables are used.

The support email address shown to students (on the Help page and in the Support chat) is a single constant, `SUPPORT_EMAIL` in `lib/support-config.ts`. It is currently a placeholder (`support@xfunction.app`); edit that one line to change it everywhere. It is no longer read from an environment variable.
