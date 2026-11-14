import type { Metadata } from "next";
import Script from "next/script";
import { Inter, Newsreader, Plus_Jakarta_Sans, Sora } from "next/font/google";
import { PostHogAppProvider } from "../components/PostHogProvider";
import "./globals.css";
import "./marketing.css";

export const metadata: Metadata = {
  title: "XFunction",
  description:
    "Turn your Canvas grades into a clear plan — track courses, get AI-powered study help, and stay ahead of deadlines.",
};

// Body copy uses Inter (already referenced everywhere as the fallback
// string "Inter, sans-serif" — this actually loads it as a web font
// instead of silently falling back to whatever sans-serif the OS
// happens to ship). Headings use Sora, a distinct-but-compatible
// geometric sans, for a clearer heading/body pairing. Both are
// exposed as CSS variables (see app/globals.css's `h1,h2,h3,h4` and
// `body` rules) so every existing page picks them up automatically —
// no per-page edits needed.
const inter = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const sora = Sora({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-heading",
  display: "swap",
});

// Brand wordmark: Plus Jakarta Sans Bold, the closest match among the
// next/font families to the lettering on the brand board (a bold geometric
// sans with round c/o, a flat-topped t and tight spacing). One weight, so a
// single self-hosted file. Used only by components/Wordmark.tsx.
const brandSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: "700",
  variable: "--font-brand",
  display: "swap",
});

// Display serif for large marketing headings
// (see app/marketing.css). Self-hosted by next/font like the two above —
// no external requests at runtime. preload is off on purpose: the app
// pages never use it, so they shouldn't pay to preload it; it's fetched
// only when a page actually renders text in this family. next/font also
// generates a size-adjusted fallback so the swap doesn't shift layout.
const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-display",
  display: "swap",
  preload: false,
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // suppressHydrationWarning: the script below sets data-theme on this
    // element before React hydrates, based on localStorage — which the
    // server can't see, so the attribute legitimately differs between
    // server- and client-rendered HTML. That's expected here, not a
    // real bug, so React shouldn't warn about (or try to "fix") it —
    // same recommended pattern as Next.js's own dark-mode docs.
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${sora.variable} ${newsreader.variable} ${brandSans.variable}`}>
      <head>
        {/* Sets data-theme before first paint so returning dark-mode
            users don't see a flash of the light theme. A plain <script>
            here (not next/script) — next/script's beforeInteractive
            strategy renders itself as a direct child of <html>, which
            isn't valid HTML and throws a real hydration error; a raw
            script tag works because the browser executes it during the
            initial HTML parse, before React ever touches this node. The
            toggle lives in Settings → Appearance (components/SettingsContent.tsx). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem('theme')==='dark'){document.documentElement.setAttribute('data-theme','dark');}}catch(e){}})();`,
          }}
        />
      </head>

      {/* ✅ GOOGLE ANALYTICS */}
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-36QMZ0WK30"
        strategy="afterInteractive"
      />

      <Script id="google-analytics" strategy="afterInteractive">
        {`
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-36QMZ0WK30');
`}
      </Script>

      <body>
        <PostHogAppProvider>{children}</PostHogAppProvider>
      </body>

    </html>
  );
}