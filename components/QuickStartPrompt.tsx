"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ClipboardPaste, X } from "lucide-react";

// The "Add your classes in a minute" card shown on Today and Courses while the
// student has zero classes. Never forced: "Not now" hides it (remembered in
// this browser only, a display preference, nothing about the student's data).
const KEY = "xf-quickstart-dismissed";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener("xf-quickstart-dismissed", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("xf-quickstart-dismissed", onChange);
  };
}

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function QuickStartPrompt() {
  // Server render and first paint show the card; the saved choice applies after.
  const dismissed = useSyncExternalStore(subscribe, readDismissed, () => false);
  if (dismissed) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(KEY, "1");
    } catch {
      // Storage unavailable: it just comes back next visit.
    }
    window.dispatchEvent(new Event("xf-quickstart-dismissed"));
  };

  return (
    <section className="xf-surface qs-prompt" aria-labelledby="qs-prompt-title">
      <div className="qs-prompt__icon" aria-hidden="true">
        <ClipboardPaste size={22} strokeWidth={2} />
      </div>
      <div className="qs-prompt__body">
        <h2 id="qs-prompt-title" className="qs-prompt__title">
          Add your classes in about a minute
        </h2>
        <p className="qs-prompt__text">Paste a syllabus or a list of what&apos;s due. No typing every assignment.</p>
        <div className="qs-actions">
          <Link href="/start" className="xf-btn">
            Quick Start
          </Link>
          <button type="button" className="xf-link" onClick={dismiss}>
            Not now
          </button>
        </div>
      </div>
      <button type="button" className="qs-prompt__close" onClick={dismiss} aria-label="Hide Quick Start">
        <X size={16} strokeWidth={2} aria-hidden="true" />
      </button>
    </section>
  );
}
