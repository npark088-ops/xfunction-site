"use client";

import dynamic from "next/dynamic";
import { MarketingFooter } from "../../components/MarketingFooter";
import { MarketingNav } from "../../components/MarketingNav";
import { Wordmark } from "../../components/Wordmark";
import "./hero-preview.css";

// The canvas hero is a separate chunk, fetched in the browser only on this
// page — no other page loads any of it.
const AsciiHeroX = dynamic(() => import("../../components/hero/AsciiHeroX"), {
  ssr: false,
  loading: () => <div className="hx-btn" aria-hidden="true" />,
});

// The same Google Analytics call the landing page's nav makes for its "App"
// link (see components/MarketingNav.tsx: gtag("event", "click_app")).
const trackApp = () => {
  (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag?.("event", "click_app");
};

export default function HeroPreviewClient() {
  return (
    <div className="mk-page">
      {/* same nav as the landing page: its App link goes to /today and fires the same events */}
      <MarketingNav appHref="/today" trackClicks />

      <main className="mk-main">
        <section className="hx-hero">
          <AsciiHeroX href="/today" onActivate={trackApp} />

          {/* headline + subtext: exactly as on the landing page (app/page.tsx) */}
          <h1 className="hx-title">
            <Wordmark size="xl" tone="light" />
          </h1>
          <p className="hx-sub">
            A system designed to transform complexity into clarity, enabling consistent execution and long-term progress.
          </p>
        </section>
      </main>

      <MarketingFooter appHref="/today" />
    </div>
  );
}
