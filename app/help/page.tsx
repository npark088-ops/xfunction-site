import Link from "next/link";
import { MarketingNav } from "../../components/MarketingNav";
import { MarketingFooter } from "../../components/MarketingFooter";
import { FaqList } from "../../components/FaqList";
import { SUPPORT_EMAIL } from "../../lib/support-config";
import { AI_LIMITS } from "../../lib/ai-limits";

// The same five questions. The answers about importing classes and about
// Free vs Pro were reworded to be accurate: importing is "coming soon", and Pro
// has a large DAILY allowance rather than unlimited AI. The numbers come from
// lib/ai-limits.ts so they can't drift from what the app enforces.
const FREE = AI_LIMITS.free;
const PRO = AI_LIMITS.pro;
const FAQS = [
  {
    q: "What is XFunction?",
    a: "XFunction is a grade-tracking and study-planning app for students. You add your courses and assignments, it shows your current grade and how it's trending, and AI helps with study plans, study guides, practice quizzes, and quick coach check-ins so you always know what to work on next.",
  },
  {
    q: "Can I import my classes from Canvas or my school's platform?",
    a: "Not yet. Importing from Canvas, Google Classroom, Schoology and other school platforms is coming soon. For now, add your classes and assignments by hand on the Courses page, or load the demo data to look around. Systems like PowerSchool will take longer, because they need your district's approval first.",
  },
  {
    q: "What's free vs. Pro?",
    a: `Free includes unlimited grade tracking across all your courses, grade trend charts, in-app deadline reminders, daily streak tracking, and a small monthly allowance of AI help: ${FREE.shared.limit} AI generations a month (study plans, study guides, practice quizzes, and coach check-ins combined) and ${FREE.ask.limit} messages a month to Your Consultant. Pro is $7/month and gives you a much larger allowance that resets every day instead: up to ${PRO.shared.limit} AI generations and ${PRO.ask.limit} Consultant messages a day.`,
  },
  {
    q: "How do AI generations work?",
    a: `Study plans, study guides, practice quizzes, and coach check-ins all draw from the same pool, not a separate allowance for each. Free accounts get ${FREE.shared.limit} a month, and the count starts over at the start of each month. Pro accounts get up to ${PRO.shared.limit} a day, and the count starts over every day at your local midnight. Your Consultant has its own allowance (${FREE.ask.limit} a month on Free, ${PRO.ask.limit} a day on Pro). You can see your usage on the Settings page.`,
  },
  {
    q: "How do I cancel Pro?",
    a: "Go to Settings → Plan and click \"Manage billing.\" That opens Stripe's billing portal, where you can update your card, view past invoices, or cancel your subscription — no need to email anyone.",
  },
];

// SUPPORT_EMAIL comes from lib/support-config.ts: the one constant that is also
// the address the in-app support chat tells students to email.
export default function HelpPage() {
  return (
    <div className="mk-page">
      <MarketingNav />

      <main className="mk-main">
        {/* HERO */}
        <section className="help-hero">
          <div className="mk-container">
            <h1 className="mk-h1">Help &amp; FAQ</h1>
            <p className="mk-lead">Common questions about how XFunction works.</p>
          </div>
        </section>

        <section className="help-body">
          <div className="mk-container help-grid">
            <FaqList items={FAQS} />

            <aside className="mk-card help-contact" aria-labelledby="help-contact-title">
              <h2 id="help-contact-title" className="mk-h3">
                Contact us
              </h2>
              <p>
                Signed in? Open the support chat — the headset button in the bottom-right corner of the app — for
                help with billing or how features work.
              </p>
              <p>
                Still stuck? Email{" "}
                <a href={`mailto:${SUPPORT_EMAIL}`} className="help-contact__mail">
                  {SUPPORT_EMAIL}
                </a>
                .
              </p>
              <Link href="/overview" className="mk-btn mk-btn--primary mk-btn--block">
                Open the app
              </Link>
            </aside>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
