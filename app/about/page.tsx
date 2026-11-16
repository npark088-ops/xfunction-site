import { MarketingNav } from "../../components/MarketingNav";
import { MarketingFooter } from "../../components/MarketingFooter";
import { Reveal } from "../../components/Reveal";

// Wording is the page's original copy, unchanged — only the layout and
// styling are new (styles: the "About" block in app/marketing.css).
const SECTIONS = [
  {
    title: "The problem",
    paragraphs: [
      "Most productivity systems rely heavily on constant planning, reconsideration, and motivation. This creates friction and leads to inconsistent execution.",
      "Over time, this inconsistency prevents meaningful progress and makes even simple tasks feel overwhelming.",
    ],
  },
  {
    title: "What XFunction does",
    paragraphs: [
      "XFunction transforms complex workflows into structured systems. Instead of deciding what to do next, users follow predefined steps that guide execution.",
      "This removes indecision, reduces wasted time, and allows users to focus entirely on making progress.",
    ],
  },
  {
    title: "Our approach",
    paragraphs: [
      "By simplifying decisions and structuring workflows, XFunction enables consistent execution regardless of external factors.",
      "The result is a system that supports long-term productivity through clarity, structure, and repetition.",
    ],
  },
];

export default function About() {
  return (
    <div className="mk-page">
      <MarketingNav />

      <main className="mk-main">
        {/* HERO */}
        <section className="about-hero">
          <div className="mk-container">
            <h1 className="mk-h1">
              About <span className="mk-em">XFunction</span>
            </h1>
            <p className="mk-lead">
              XFunction is designed to eliminate the gap between planning and execution, enabling
              consistent, structured progress over time.
            </p>
          </div>
        </section>

        {/* THE STORY — three numbered rows */}
        <div className="about-rows">
          {SECTIONS.map((section) => (
            <Reveal as="section" className="about-row" key={section.title}>
              <div className="mk-container about-grid">
                <h2 className="mk-h2 about-row__title">{section.title}</h2>
                <div className="mk-prose">
                  {section.paragraphs.map((p) => (
                    <p key={p}>{p}</p>
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* MISSION */}
        <Reveal as="section" className="about-mission">
          <div className="mk-container">
            <h2 className="about-mission__label">Designed for real progress</h2>
            <p className="about-mission__quote">
              XFunction is not about doing more work. It’s about creating systems that make progress
              inevitable.
            </p>
          </div>
        </Reveal>
      </main>

      <MarketingFooter />
    </div>
  );
}
