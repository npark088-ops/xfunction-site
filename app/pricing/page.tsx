"use client";

import Link from "next/link";
import { useState } from "react";
import { Check } from "lucide-react";
import posthog from "posthog-js";
import { MarketingNav } from "../../components/MarketingNav";
import { MarketingFooter } from "../../components/MarketingFooter";
import { Reveal } from "../../components/Reveal";

// Plan names, prices, feature lists and button labels are the page's
// original text, unchanged. Only the layout and styling are new (styles:
// the "Pricing" block in app/marketing.css). The checkout flow below is
// exactly as it was.
const FREE_FEATURES = [
  "Unlimited grade tracking across all your courses",
  "Grade trend charts",
  "Email & text deadline reminders",
  "Daily streak tracking",
  "3 AI generations / month (study plans, study guides, practice quizzes, coach check-ins combined)",
];

const PRO_FEATURES = [
  "Everything in Free",
  "Unlimited study plans",
  "Unlimited study guides",
  "Unlimited practice quizzes",
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
        {/* HERO */}
        <section className="pr-hero">
          <div className="mk-container">
            <h1 className="mk-h1">Simple pricing</h1>
            <p className="mk-lead">Start free. Upgrade whenever you want unlimited AI help.</p>
          </div>
        </section>

        {/* PLANS */}
        <section className="pr-body">
          <div className="mk-container">
            <div className="pr-grid">
              {/* FREE */}
              <Reveal className="pr-slot">
                <div className="mk-card mk-card--hover pr-card">
                  <div className="pr-card__label">Free</div>
                  <div className="pr-price">
                    $0<span className="pr-price__unit"> /month</span>
                  </div>
                  <p className="pr-card__desc">Everything you need to stay on top of your grades.</p>

                  <ul className="pr-features">
                    {FREE_FEATURES.map((f) => (
                      <li key={f}>
                        <Check size={16} strokeWidth={2.5} aria-hidden="true" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Link href="/login" className="mk-btn mk-btn--ghost mk-btn--block pr-cta">
                    Get started free
                  </Link>
                </div>
              </Reveal>

              {/* PRO */}
              <Reveal className="pr-slot" delay={80}>
                <div className="mk-card mk-card--hover pr-card pr-card--pro">
                  <div className="pr-tag">Unlimited AI</div>

                  <div className="pr-card__label">XFunction Pro</div>
                  <div className="pr-price">
                    $7<span className="pr-price__unit"> /month</span>
                  </div>
                  <p className="pr-card__desc">For when 3 AI generations a month isn&apos;t enough.</p>

                  <ul className="pr-features">
                    {PRO_FEATURES.map((f) => (
                      <li key={f}>
                        <Check size={16} strokeWidth={2.5} aria-hidden="true" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={startCheckout}
                    disabled={loading}
                    className="mk-btn mk-btn--primary mk-btn--block pr-cta"
                  >
                    {loading ? "Redirecting…" : "Upgrade to Pro"}
                  </button>
                  {error && (
                    <div className="pr-error" role="alert">
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
