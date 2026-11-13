"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { LogoIntro } from "./LogoIntro";

// Shared top bar for the public pages (landing, About, Pricing, Help,
// What's New). Replaces five hand-copied nav blocks. Same six links and
// labels as before; two things differ per page and are kept as props so no
// link or tracking behaviour changes:
//   appHref     where "App" points — the landing page has always gone to
//               /today, the other pages to /overview
//   trackClicks the landing page has always sent a Google Analytics event
//               per nav click (click_home, click_about, ...); the other
//               pages never did, so they leave this off
// Below 860px the links collapse into a "Menu" button with a dropdown
// panel (no sideways-scrolling link row). Styles: app/marketing.css (.mk-nav*).
export function MarketingNav({
  appHref = "/overview",
  trackClicks = false,
}: {
  appHref?: string;
  trackClicks?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/", label: "Home", event: "click_home" },
    { href: "/about", label: "About", event: "click_about" },
    { href: "/pricing", label: "Pricing", event: "click_pricing" },
    { href: "/help", label: "Help", event: "click_help" },
    { href: "/changelog", label: "What’s New", event: "click_changelog" },
    { href: appHref, label: "App", event: "click_app" },
  ];

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const onLinkClick = (event: string) => {
    setOpen(false);
    if (trackClicks) {
      (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag?.("event", event);
    }
  };

  const isCurrent = (href: string) => href !== appHref && pathname === href;

  return (
    <header className="mk-nav">
      <div className="mk-container mk-nav__inner">
        <span className="mk-nav__brand">
          <LogoIntro />
        </span>

        <nav className="mk-nav__links" aria-label="Main">
          {links.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className={`mk-nav__link${l.label === "App" ? " mk-nav__link--app" : ""}`}
              aria-current={isCurrent(l.href) ? "page" : undefined}
              onClick={() => onLinkClick(l.event)}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          className="mk-nav__menu-btn"
          aria-expanded={open}
          aria-controls="mk-nav-panel"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={16} strokeWidth={2} /> : <Menu size={16} strokeWidth={2} />}
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {open && (
        <nav id="mk-nav-panel" className="mk-nav__panel" aria-label="Main">
          {links.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              aria-current={isCurrent(l.href) ? "page" : undefined}
              onClick={() => onLinkClick(l.event)}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
