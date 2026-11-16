import { MarketingNav } from "../../components/MarketingNav";
import { MarketingFooter } from "../../components/MarketingFooter";
import { Reveal } from "../../components/Reveal";

interface ChangelogEntry {
  date: string;
  title: string;
  text: string;
}

// A short, plain-language summary of what shipped, newest first: one headline
// and one line per release. Dates are approximate groupings of real work, not
// a promise that a feature landed on that exact minute. (Layout and styles:
// the "Simplified page layout" block in app/marketing.css.)
const ENTRIES: ChangelogEntry[] = [
  {
    date: "August 6, 2026",
    title: "Your Consultant and smarter search",
    text: "Chat with an AI advisor about your real grades, search and compare courses, and plan all your work at once.",
  },
  {
    date: "August 5, 2026",
    title: "A cleaner look and dark mode",
    text: "New design, a dark mode toggle, a sidebar, a focus timer, notes, goals and a parent view.",
  },
  {
    date: "August 4, 2026",
    title: "AI study tools and XFunction Pro",
    text: "Study plans, guides, quizzes and coach check-ins built from your real courses. Pro removes the monthly AI limit.",
  },
  {
    date: "July 30, 2026",
    title: "Grade tracking arrives",
    text: "See your current grade and how it's trending, for every course.",
  },
  {
    date: "July 2–3, 2026",
    title: "Tasks and an early AI coach",
    text: "Track tasks outside Canvas, and let AI break each one into steps.",
  },
  {
    date: "June 27, 2026",
    title: "XFunction launches",
    text: "Connect Canvas and see your courses in one place.",
  },
];

export default function ChangelogPage() {
  return (
    <div className="mk-page">
      <MarketingNav />

      <main className="mk-main">
        <section className="sm-hero">
          <div className="mk-container">
            <h1 className="sm-h1">What&apos;s new</h1>
            <span className="sm-accent" aria-hidden="true" />
            <p className="sm-lead">The latest in XFunction, newest first.</p>
          </div>
        </section>

        <section className="sm-section sm-section--flush-top">
          <div className="mk-container">
            <ol className="sm-updates">
              {ENTRIES.map((entry) => (
                <Reveal as="li" className="sm-card sm-update" key={entry.date}>
                  <span className="sm-chip">{entry.date}</span>
                  <h2 className="sm-h3">{entry.title}</h2>
                  <p>{entry.text}</p>
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
