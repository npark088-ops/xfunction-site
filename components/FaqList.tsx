import { ChevronDown } from "lucide-react";
import { Reveal } from "./Reveal";

export type FaqItem = { q: string; a: string };

// The Help page's questions. Each is a native <details>/<summary>, so it is
// keyboard- and screen-reader-accessible and needs no JavaScript. With only a
// handful of short questions there is nothing to search, so the old search box
// is gone: fewer controls, simpler page. Styles: the "Simplified page layout"
// block in app/marketing.css (.sm-faq*).
export function FaqList({ items }: { items: FaqItem[] }) {
  return (
    <div className="sm-faq">
      {items.map((item, i) => (
        <Reveal key={item.q} delay={Math.min(i, 4) * 40}>
          <details className="mk-card sm-faq__item">
            <summary>
              <h2 className="sm-faq__q">{item.q}</h2>
              <ChevronDown className="sm-faq__chev" size={20} strokeWidth={2} aria-hidden="true" />
            </summary>
            <p className="sm-faq__a">{item.a}</p>
          </details>
        </Reveal>
      ))}
    </div>
  );
}
