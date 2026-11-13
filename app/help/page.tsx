import Link from "next/link";
import { MarketingNav } from "../../components/MarketingNav";
import { MarketingFooter } from "../../components/MarketingFooter";
import { FaqList } from "../../components/FaqList";
import { SUPPORT_EMAIL } from "../../lib/support-config";

// The five questions and answers are the page's original text, unchanged.
const FAQS = [
  {
    q: "What is XFunction?",
    a: "XFunction is a grade-tracking and study-planning app for students. It pulls your courses and assignments in from Canvas, shows your current grade and how it's trending, and uses AI to generate study plans, study guides, practice quizzes, and quick coach check-ins so you always know what to work on next.",
  },
  {
    q: "How does connecting my platform work?",
    a: "Go to the Courses page and find \"Connect your platform.\" Pick whichever your school actually uses — Canvas, Google Classroom, and Schoology all work today; PowerSchool is coming soon and needs district-level approval first. Right now every platform runs on a local mock stand-in for demo purposes — no real login or credentials are needed. Once connected, your courses and assignments show up across Overview, Courses, and each course's Grades page.",
  },
  {
    q: "What's free vs. Pro?",
    a: "Free includes unlimited grade tracking across all your courses, grade trend charts, email & text deadline reminders, daily streak tracking, and 3 AI generations a month (study plans, study guides, practice quizzes, and coach check-ins combined). Pro is $7/month and removes the AI generation limit entirely — unlimited study plans, study guides, practice quizzes, and coach check-ins.",
  },
  {
    q: "How do AI generations work?",
    a: "Study plans, study guides, practice quizzes, and coach check-ins all draw from the same monthly pool — 3 free generations total, not 3 of each. The count resets automatically at the start of each calendar month, and you can see your current usage on the Settings page. Pro accounts skip the limit entirely.",
  },
  {
    q: "How do I cancel Pro?",
    a: "Go to Settings → Plan and click \"Manage billing.\" That opens Stripe's billing portal, where you can update your card, view past invoices, or cancel your subscription — no need to email anyone.",
  },
];

// Server component: SUPPORT_EMAIL is read from the server environment (the
// same address the in-app support chat tells students to email). The
// in-app support chat itself is untouched — it lives in the signed-in app.
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
                help with billing, how features work, or connecting your school platform.
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
