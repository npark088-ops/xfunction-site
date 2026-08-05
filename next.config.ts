import { setDefaultResultOrder } from "dns";
import type { NextConfig } from "next";

// Node on Windows sometimes tries IPv6 first when resolving external
// hosts (like supabase.co), which can hang or fail on networks where
// IPv6 routing is broken even though the OS reports it as available.
// That was causing proxy.ts's server-side session check
// (supabase.auth.getUser()) to intermittently fail with "fetch failed"
// even when the session cookie itself was valid. Forcing IPv4 first
// avoids that.
setDefaultResultOrder("ipv4first");

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
