"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// Initialized once per browser tab, at module load. capture_pageview is
// off because the App Router doesn't do full page loads on navigation —
// PostHogPageView below fires $pageview manually on route change instead.
// maskAllInputs is off (PostHog's own default is "mask every input"),
// with maskInputFn masking only elements explicitly opted in via the
// "ph-mask" class — see the notes/journal textareas in
// app/(dashboard)/grades/[courseId]/page.tsx — so session recordings stay
// useful for everything else (search, task titles, chat) while private
// notes never leave the browser in a replay.
if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    capture_pageview: false,
    person_profiles: "identified_only",
    session_recording: {
      maskAllInputs: false,
      maskInputFn: (text, element) => {
        if (element?.classList.contains("ph-mask")) {
          return "*".repeat(text.length);
        }
        return text;
      },
    },
  });
}

function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname || !process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    const query = searchParams.toString();
    posthog.capture("$pageview", {
      $current_url: query ? `${window.location.origin}${pathname}?${query}` : `${window.location.origin}${pathname}`,
    });
  }, [pathname, searchParams]);

  return null;
}

export function PostHogAppProvider({ children }: { children: React.ReactNode }) {
  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </PHProvider>
  );
}
