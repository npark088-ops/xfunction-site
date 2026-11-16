import Link from "next/link";
import { ListChecks, Repeat, Shuffle } from "lucide-react";
import { MarketingNav } from "../../components/MarketingNav";
import { MarketingFooter } from "../../components/MarketingFooter";
import { IconCards } from "../../components/IconCards";
import { Reveal } from "../../components/Reveal";

// Short on purpose: each idea is one small card. (Layout and styles: the
// "Simplified page layout" block in app/marketing.css.)
const CARDS = [
  {
    icon: Shuffle,
    title: "The problem",
    text: "Constant planning and shaky motivation create friction, so progress stalls.",
  },
  {
    icon: ListChecks,
    title: "What we do",
    text: "We turn messy work into clear steps, so you never have to decide what's next.",
  },
  {
    icon: Repeat,
    title: "Our approach",
    text: "Fewer decisions and steady routines make progress last.",
  },
];

export default function About() {
  return (
    <div className="mk-page">
      <MarketingNav />

      <main className="mk-main">
        <section className="sm-hero">
          <div className="mk-container">
            <h1 className="sm-h1">About XFunction</h1>
            <span className="sm-accent" aria-hidden="true" />
            <p className="sm-lead">We close the gap between planning and doing.</p>
          </div>
        </section>

        <Reveal as="section" className="sm-section sm-section--flush-top">
          <div className="mk-container">
            <IconCards items={CARDS} level="h2" />
          </div>
        </Reveal>

        <Reveal as="section" className="sm-section">
          <div className="mk-container">
            <div className="sm-cta">
              <h2 className="sm-h2">Designed for real progress</h2>
              <p className="sm-lead">Not more work. A system that makes progress inevitable.</p>
              <div className="sm-btn-row">
                <Link href="/login" className="mk-btn mk-btn--primary mk-btn--lg">
                  Get started free
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </main>

      <MarketingFooter />
    </div>
  );
}
