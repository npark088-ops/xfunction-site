// The one XFunction wordmark: the brand mark followed by "Function" in Plus
// Jakarta Sans Bold. The mark already contains the letter X, so IT is the "X"
// of the name (it reads as "XFunction", not "XXFunction"). A visually hidden
// "X" is kept in the text so screen readers, copy/paste and search still see
// the full name "XFunction". Use it anywhere the product name is shown as a logo — nav,
// landing hero, footer, login, sidebar, parent view — so it can't drift.
// Styles live in app/marketing.css (.mk-wordmark*).
//
//   size: sm (20px) · md (25px, nav) · lg (34px) · xl (fluid, hero)
//   tone: "auto"  — navy text + full-colour mark on light, white text +
//                   white mark on dark (follows the site theme)
//         "light" — always white, for sitting on photos or video
//
// The mark is public/brand/logo-mark.svg (full colour) and
// public/brand/logo-mark-white.svg, decorative (alt="") because the text
// carries the name. The text is live text, crisp at any size. Headings keep their own element: wrap it, e.g.
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="mk-wordmark__mark mk-wordmark__mark--color"
        src="/brand/logo-mark.svg"
        alt=""
        width={133}
        height={100}
        aria-hidden="true"
        draggable={false}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="mk-wordmark__mark mk-wordmark__mark--white"
        src="/brand/logo-mark-white.svg"
        alt=""
        width={133}
        height={100}
        aria-hidden="true"
        loading="lazy"
        draggable={false}
      />
      <span className="mk-wordmark__text">
        <span className="mk-wordmark__x-sr">X</span>Function
      </span>
    </span>
  );
}
