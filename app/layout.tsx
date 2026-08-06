import Script from "next/script";
import "./globals.css";

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
    <html lang="en" suppressHydrationWarning>
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
        {children}
      </body>

    </html>
  );
}