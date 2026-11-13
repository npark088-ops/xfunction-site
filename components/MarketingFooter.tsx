import Link from "next/link";
import { Wordmark } from "./Wordmark";

// Shared footer for the public pages. Uses only wording and links that
// already exist on the site: the wordmark, the tagline from the landing
// page ("Plan less. Execute more."), and the same six links as the nav.
// Styles: app/marketing.css (.mk-footer*).
export function MarketingFooter({ appHref = "/overview" }: { appHref?: string }) {
  const links = [
    { href: "/", label: "Home" },
    { href: "/about", label: "About" },
    { href: "/pricing", label: "Pricing" },
    { href: "/help", label: "Help" },
    { href: "/changelog", label: "What’s New" },
    { href: appHref, label: "App" },
  ];
  return (
    <footer className="mk-footer">
      <div className="mk-container mk-footer__inner">
        <div>
          <Wordmark size="md" />
          <p className="mk-footer__tagline">Plan less. Execute more.</p>
        </div>
        <nav className="mk-footer__links" aria-label="Footer">
          {links.map((l) => (
            <Link key={l.label} href={l.href}>
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
