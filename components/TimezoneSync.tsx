"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TIMEZONE_COOKIE, browserTimeZone } from "../lib/local-date";

// Tells the server which time zone this browser is in, so "today" means the
// student's own day (see lib/request-tz.ts). It stores the zone name in a
// cookie. The first time (or after the student travels to another zone) the
// server has just rendered the page with a guess, so the page is refreshed
// once to redraw it with the right day. Renders nothing.
export function TimezoneSync() {
  const router = useRouter();

  useEffect(() => {
    const zone = browserTimeZone();
    const stored = document.cookie
      .split("; ")
      .find((part) => part.startsWith(`${TIMEZONE_COOKIE}=`))
      ?.slice(TIMEZONE_COOKIE.length + 1);
    if (stored && decodeURIComponent(stored) === zone) return;

    document.cookie = `${TIMEZONE_COOKIE}=${encodeURIComponent(zone)}; path=/; max-age=31536000; SameSite=Lax`;
    router.refresh();
  }, [router]);

  return null;
}
