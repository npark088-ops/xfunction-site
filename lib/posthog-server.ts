import { PostHog } from "posthog-node";

// Server-side capture for events tied to backend logic rather than a
// click — AI generations (app/api/study-plan, study-guide,
// practice-quiz, ask) and confirmed Pro upgrades (app/api/stripe/webhook),
// where the client never actually knows whether the action succeeded.
// flushAt/flushInterval are set for serverless: functions can terminate
// before a background batch timer fires, so each capture sends right away
// instead of buffering.
let client: PostHog | null = null;

function getClient(): PostHog | null {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return null;
  if (!client) {
    client = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return client;
}

export function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>
) {
  const posthog = getClient();
  if (!posthog) return;
  posthog.capture({ distinctId, event, properties });
}
