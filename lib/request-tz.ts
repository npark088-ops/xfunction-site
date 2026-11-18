import "server-only";
import { cookies, headers } from "next/headers";
import { TIMEZONE_COOKIE, TIMEZONE_HEADER, resolveTimeZone } from "./local-date";

// The student's time zone for this request: the `x-timezone` header if the
// browser sent one (fetches do), otherwise the `xf_tz` cookie that
// components/TimezoneSync.tsx sets, otherwise UTC. Always a valid zone name.
export async function getRequestTimeZone(): Promise<string> {
  const fromHeader = (await headers()).get(TIMEZONE_HEADER);
  if (fromHeader) return resolveTimeZone(fromHeader);
  const fromCookie = (await cookies()).get(TIMEZONE_COOKIE)?.value;
  return resolveTimeZone(fromCookie ? decodeURIComponent(fromCookie) : null);
}
