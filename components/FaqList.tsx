"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { Reveal } from "./Reveal";

export type FaqItem = { q: string; a: string };

// Searchable accordion for the Help page. Each question is a native
// <details>/<summary>, so it is keyboard- and screen-reader-accessible and
// works without any extra JavaScript; the search box just filters which
// questions are shown (matching the question or the answer text).
// Styles: the "Help" block in app/marketing.css.
export function FaqList({ items }: { items: FaqItem[] }) {
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <div>
      <div className="help-search">
        <Search size={18} strokeWidth={2} aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the FAQ"
          aria-label="Search the FAQ"
        />
      </div>
      <p className="help-count" aria-live="polite">
        {query.trim() ? `${shown.length} of ${items.length} questions` : `${items.length} questions`}
      </p>

      {shown.length === 0 ? (
        <div className="mk-card help-empty">No questions match “{query.trim()}”.</div>
      ) : (
        <div className="help-list">
          {shown.map((item, i) => (
            <Reveal key={item.q} delay={Math.min(i, 4) * 40}>
              <details className="mk-card help-item">
                <summary>
                  <h2 className="help-q">{item.q}</h2>
                  <ChevronDown className="help-chevron" size={20} strokeWidth={2} aria-hidden="true" />
                </summary>
                <p className="help-a">{item.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
