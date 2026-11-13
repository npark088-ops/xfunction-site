// The one XFunction wordmark. Use this anywhere the product name is shown
// as a logo — nav, landing hero, footer, login, sidebar — so it can't drift.
// Styles live in app/marketing.css (.mk-wordmark*).
//
//   size: sm (20px) · md (25px, nav) · lg (34px) · xl (fluid, hero)
//   tone: "auto"  — follows light/dark theme
//         "light" — white, for sitting on photos or video
//
// It renders plain text ("XFunction", split into two spans purely for
// styling), so screen readers read it as one word and it stays crisp at any
// size. Headings keep their own element: wrap it, e.g.
// <h1><Wordmark size="xl" /></h1>.
export function Wordmark({
  size = "md",
  tone = "auto",
  className = "",
}: {
  size?: "sm" | "md" | "lg" | "xl";
  tone?: "auto" | "light";
  className?: string;
}) {
  const classes = ["mk-wordmark", `mk-wordmark--${size}`, tone === "light" ? "mk-wordmark--light" : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={classes}>
      <span className="mk-wordmark__x">X</span>
      <span className="mk-wordmark__rest">Function</span>
    </span>
  );
}
