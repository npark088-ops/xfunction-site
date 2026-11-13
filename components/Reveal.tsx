"use client";

import { useEffect, useRef } from "react";

// Gentle fade + slide-up as a section scrolls into view. Styles:
// .mk-reveal / .mk-reveal-pending in app/marketing.css.
//
// Content is visible by default. After mount, an element that starts
// BELOW the fold is marked "pending" (transparent, nudged down) and an
// IntersectionObserver lets it in when it nears the viewport. Anything
// already on screen is left alone, and nothing is hidden at all for
// visitors who prefer reduced motion — or when JS/IntersectionObserver
// isn't available — so content can never get stuck invisible.
export function Reveal({
  children,
  delay = 0,
  as = "div",
  className = "",
}: {
  children: React.ReactNode;
  /** Extra stagger, in milliseconds. */
  delay?: number;
  as?: "div" | "section" | "article" | "li";
  className?: string;
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;

    el.classList.add("mk-reveal-pending");
    const show = () => el.classList.remove("mk-reveal-pending");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          show();
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
    );
    observer.observe(el);

    // Safety net: if the element is on screen after a few seconds but the
    // observer never fired (backgrounded tab, odd embed), show it anyway.
    const safety = window.setTimeout(() => {
      if (el.getBoundingClientRect().top < window.innerHeight) show();
    }, 3000);

    return () => {
      observer.disconnect();
      window.clearTimeout(safety);
      show();
    };
  }, []);

  // Type-only: with @react-three/fiber installed, React.ElementType grows a
  // huge union of 3D element names that JSX can't resolve, so say plainly
  // what this is — an ordinary HTML element tag taking a ref and a class.
  const Comp = as as unknown as React.ComponentType<
    React.HTMLAttributes<HTMLElement> & { ref?: React.Ref<HTMLElement> }
  >;
  return (
    <Comp
      ref={ref}
      className={`mk-reveal ${className}`.trim()}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Comp>
  );
}
