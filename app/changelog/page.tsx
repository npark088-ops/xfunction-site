import { MarketingNav } from "../../components/MarketingNav";
import { MarketingFooter } from "../../components/MarketingFooter";
import { Reveal } from "../../components/Reveal";

interface ChangelogEntry {
  date: string;
  title: string;
  items: string[];
}

// A genuine, plain-language summary of what's actually shipped, newest
// first — not raw commit messages. Dates are approximate groupings of
// real work, not a promise that a feature landed on that exact minute.
// (Entries are the page's original text, unchanged — only the layout is new;
// styles: the "What's New" block in app/marketing.css.)
const ENTRIES: ChangelogEntry[] = [
  {
    date: "August 6, 2026",
    title: "Your Consultant, smarter search, and an honesty pass",
    items: [
      "Added Your Consultant — an AI chat advisor you can ask open-ended questions about your actual grades and coursework, grounded in your real data.",
      "Added cross-course search and a side-by-side course comparison view.",
      "Added a homework time estimator and a bulk study plan generator that covers every upcoming assignment across all your courses at once, prioritized sensibly.",
      "Added private teacher/class ratings and notes, plus a tracker for how accurate the AI's grade predictions have been for you.",
      "Labeled sample data clearly across the app, so it's always obvious when you're looking at demo data instead of your real Canvas grades.",
    ],
  },
  {
    date: "August 5, 2026",
    title: "A redesign: light theme, dark mode, and a real sidebar",
    items: [
      "Rebuilt the app around a cleaner, lighter visual style, with a genuine dark mode toggle in Settings.",
      "Restructured navigation into a proper sidebar — Overview, Courses, Grades, Tasks, Schedule, Settings.",
      "Added a focus timer, per-course notes, weekly email digests, and an achievements/badges system.",
      "Added grade goals, practice quizzes, a class schedule view, editable study plans, PDF export, in-app notifications, and a parent/guardian view.",
    ],
  },
  {
    date: "August 4, 2026",
    title: "AI study tools, Pricing, and XFunction Pro",
    items: [
      "Added AI-powered study plans, study guides, practice quizzes, and quick coach check-ins — all built around your real course and assignment data.",
      "Added a Pricing page and real subscriptions for XFunction Pro, which removes the free monthly limit on AI generations.",
      "General performance improvements across the app.",
    ],
  },
  {
    date: "July 30, 2026",
    title: "Grade tracking arrives",
    items: [
      "Added the Grades page — your current grade, a category-by-category breakdown, and how it's trending over time, for every course.",
    ],
  },
  {
    date: "July 2–3, 2026",
    title: "Tasks and an early AI coach",
    items: [
      "Added a Tasks page for tracking assignments outside of Canvas.",
      "Added AI that breaks a task down into concrete, actionable steps.",
    ],
  },
  {
    date: "June 27, 2026",
    title: "XFunction launches",
    items: [
      "First version of XFunction: connect your Canvas account and see your courses in one place.",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="mk-page">
      <MarketingNav />

      <main className="mk-main">
        {/* HERO */}
        <section className="cl-hero">
          <div className="mk-container">
            <h1 className="mk-h1">What&apos;s new</h1>
            <p className="mk-lead">
              A running list of what&apos;s shipped in XFunction, in plain language — newest first.
            </p>
          </div>
        </section>

        {/* TIMELINE */}
        <section className="cl-body">
          <div className="mk-container">
            <ol className="cl-timeline">
              {ENTRIES.map((entry) => (
                <Reveal as="li" className="cl-entry" key={entry.date}>
                  <div className="cl-date">{entry.date}</div>
                  <div className="cl-content">
                    <h2 className="mk-h3">{entry.title}</h2>
                    <ul className="cl-items">
                      {entry.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
