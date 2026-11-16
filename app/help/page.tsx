import Link from "next/link";
import { MarketingNav } from "../../components/MarketingNav";
import { MarketingFooter } from "../../components/MarketingFooter";
import { FaqList } from "../../components/FaqList";
import { SUPPORT_EMAIL } from "../../lib/support-config";

// Short answers: the same five questions, one or two lines each.
const FAQS = [
  {
    q: "What is XFunction?",
    a: "A grade tracker and study planner. It pulls in your courses, shows how your grades are trending, and uses AI to build study plans, guides and quizzes.",
  },
  {
    q: "How do I connect my school platform?",
    a: "Open Courses, find “Connect your platform” and pick yours: Canvas, Google Classroom or Schoology. PowerSchool is coming soon. For now every connection uses demo data, so you don't enter a login.",
  },
  {
    q: "What's free and what's Pro?",
    a: "Free: unlimited grade tracking, trend charts, reminders, streaks and 3 AI generations a month. Pro is $7/month and makes the AI unlimited.",
  },
  {
    q: "How do AI generations work?",
    a: "Study plans, guides, quizzes and check-ins share one pool: 3 free a month, resetting each month. See your usage in Settings. Pro has no limit.",
  },
  {
    q: "How do I cancel Pro?",
    a: "Go to Settings, then Plan, then Manage billing. Stripe's billing portal lets you update your card, see invoices or cancel.",
  },
];

// Server component: SUPPORT_EMAIL is read from the server environment (the
// same address the in-app support chat tells students to email). The in-app
// support chat itself is untouched — it lives in the signed-in app.
export default function HelpPage() {
  return (
    <div className="mk-page">
      <MarketingNav />

      <main className="mk-main">
        <section className="sm-hero">
          <div className="mk-container">
            <h1 className="sm-h1">Help &amp; FAQ</h1>
            <span className="sm-accent" aria-hidden="true" />
            <p className="sm-lead">Quick answers to common questions.</p>
          </div>
        </section>

        <section className="sm-section sm-section--flush-top">
          <div className="mk-container">
            <FaqList items={FAQS} />

            <aside className="mk-card sm-contact" aria-labelledby="help-contact-title">
              <h2 id="help-contact-title" className="sm-h2">
                Still stuck?
              </h2>
              <p>Signed in? Tap the headset button in the bottom-right corner to chat with support.</p>
              <p>
                Or email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
              </p>
              <div className="sm-btn-row">
                <Link href="/overview" className="mk-btn mk-btn--primary mk-btn--lg">
                  Open the app
                </Link>
              </div>
            </aside>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
