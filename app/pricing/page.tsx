"use client";

import Link from "next/link";
import { useState } from "react";
import { Check } from "lucide-react";
import posthog from "posthog-js";
import { MarketingNav } from "../../components/MarketingNav";
import { MarketingFooter } from "../../components/MarketingFooter";
import { Reveal } from "../../components/Reveal";

// Plan names and prices are unchanged; the feature lists are shortened to one
// quick line each (same offer: Free = 3 AI generations a month, Pro = $7/month
// unlimited AI). Layout and styles: the "Simplified page layout" block in
// app/marketing.css. The checkout flow below is exactly as it was.
const FREE_FEATURES = [
  "Unlimited grade tracking",
  "Grade trend charts",
  "Email & text deadline reminders",
  "Daily streaks",
  "3 AI generations a month, shared across the study tools",
];

const PRO_FEATURES = [
  "Everything in Free",
  "Unlimited AI study plans",
  "Unlimited study guides & practice quizzes",
  "Unlimited AI coach check-ins",
];

export default function PricingPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = () => {
    setLoading(true);
    setError(null);
    posthog.capture("checkout_started", { source: "pricing_page" });
    fetch("/api/stripe/checkout", { method: "POST" })
      .then((res) => res.json().then((data) => ({ ok: res.ok, status: res.status, data })))
      .then(({ ok, status, data }) => {
        if (status === 401) {
          window.location.href = "/login?next=/pricing";
          return;
        }
        if (!ok || !data.url) {
          setError(data.error || "Failed to start checkout");
          setLoading(false);
          return;
        }
        window.location.href = data.url;
      })
      .catch(() => {
        setError("Failed to start checkout");
        setLoading(false);
      });
  };

  return (
    <div className="mk-page">
      <MarketingNav />

      <main className="mk-main">
        <section className="sm-hero">
          <div className="mk-container">
            <h1 className="sm-h1">Simple pricing</h1>
            <span className="sm-accent" aria-hidden="true" />
            <p className="sm-lead">Start free. Upgrade when you want unlimited AI.</p>
          </div>
        </section>

        <section className="sm-section sm-section--flush-top">
          <div className="mk-container">
            <div className="sm-plans">
              {/* FREE */}
              <Reveal>
                <div className="mk-card sm-plan">
                  <h2 className="sm-plan__name">Free</h2>
                  <p className="sm-price">
                    $0<span> /month</span>
                  </p>
                  <p className="sm-plan__desc">Everything you need to stay on top of your grades.</p>

                  <ul className="sm-features">
                    {FREE_FEATURES.map((f) => (
                      <li key={f}>
                        <Check size={18} strokeWidth={2.5} aria-hidden="true" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Link href="/login" className="mk-btn mk-btn--ghost mk-btn--block mk-btn--lg">
                    Get started free
                  </Link>
                </div>
              </Reveal>

              {/* PRO */}
              <Reveal delay={80}>
                <div className="mk-card sm-plan sm-plan--pro">
                  <span className="sm-chip sm-plan__tag">Unlimited AI</span>

                  <h2 className="sm-plan__name">XFunction Pro</h2>
                  <p className="sm-price">
                    $7<span> /month</span>
                  </p>
                  <p className="sm-plan__desc">For when 3 AI generations a month isn&apos;t enough.</p>

                  <ul className="sm-features">
                    {PRO_FEATURES.map((f) => (
                      <li key={f}>
                        <Check size={18} strokeWidth={2.5} aria-hidden="true" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={startCheckout}
                    disabled={loading}
                    className="mk-btn mk-btn--primary mk-btn--block mk-btn--lg"
                  >
                    {loading ? "Redirecting…" : "Upgrade to Pro"}
                  </button>
                  {error && (
                    <div className="sm-plan__error" role="alert">
                      {error}
                    </div>
                  )}
                </div>
              </Reveal>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
