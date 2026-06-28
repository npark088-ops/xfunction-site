import Script from "next/script";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">

      {/* ✅ GOOGLE ANALYTICS */}
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-4LB2D2VX3Q"
        strategy="afterInteractive"
      />

      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-4LB2D2VX3Q');
        `}
      </Script>

      <body>
        {children}
      </body>

    </html>
  );
}