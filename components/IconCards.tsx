import type { LucideIcon } from "lucide-react";

export type IconCardItem = { icon: LucideIcon; title: string; text: string };

// A row of small cards: an icon, a short title, one line of text. This is how
// the marketing pages replace long paragraphs. Phone first — one column, then
// three across on wider screens. Styles: the "Simplified page layout" block in
// app/marketing.css (.sm-cards, .sm-card, .sm-icon). `level` is the heading
// level of each card title, so the page's heading order stays correct.
export function IconCards({ items, level = "h3" }: { items: IconCardItem[]; level?: "h2" | "h3" }) {
  const Heading = level;
  return (
    <ul className="sm-cards">
      {items.map(({ icon: Icon, title, text }) => (
        <li key={title} className="sm-card">
          <span className="sm-icon" aria-hidden="true">
            <Icon size={24} strokeWidth={2} />
          </span>
          <Heading className="sm-h3">{title}</Heading>
          <p>{text}</p>
        </li>
      ))}
    </ul>
  );
}
