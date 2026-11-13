"use client";

import { useEffect, useRef, useState } from "react";

// Base paths — each clip is served as <base>.webm (tried first) and
// <base>.mp4 (fallback). The album plays them in order and loops back to
// the first. Any clip whose files are missing is skipped.
const DEFAULT_CLIPS = [
  "/videos/city-1",
  "/videos/city-2",
  "/videos/city-3",
  "/videos/city-4",
];

// How long the next clip takes to fade in over the current one.
const FADE_MS = 1400;

// Once the FIRST clip has failed to load in this tab (e.g. the files
// haven't been added), don't retry on every client-side navigation back
// to a page that uses this component.
let videoKnownMissing = false;

type NetworkInformationLike = { saveData?: boolean; effectiveType?: string };

function connectionSaysSkipVideo(): boolean {
  const c = (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
  return Boolean(c?.saveData) || c?.effectiveType === "slow-2g" || c?.effectiveType === "2g";
}

// A muted "drone view" album behind the page content: a still image
// (poster/fallback, with a slow CSS pan/zoom), an album of short video
// clips that rotate with a crossfade, and a light gradient on top so text
// stays readable. Fill the nearest positioned ancestor (the parent must
// be `position: relative` with a defined height); it never affects layout
// or blocks clicks.
//
// Layers, bottom to top:
//   1. still image — always rendered (fallback and LCP element). The slow
//      pan/zoom pauses once video is playing and is off entirely under
//      prefers-reduced-motion.
//   2. two <video> elements used as alternating slots — only mounted when
//      ALL of these hold, and only after the browser is idle:
//        - viewport >= 640px wide
//        - no prefers-reduced-motion
//        - no Save-Data / 2G connection
//      Only the first clip loads up front; each next clip is preloaded
//      into the idle slot while the current one plays, then faded in. If
//      the next clip isn't ready in time the current one simply replays,
//      and clips that fail to load are skipped. Playback pauses when the
//      hero is scrolled out of view or the tab is hidden.
//   3. gradient overlay.
export function DroneBackground({
  imageSrc,
  clips = DEFAULT_CLIPS,
}: {
  imageSrc: string;
  clips?: string[];
}) {
  const [videoWanted, setVideoWanted] = useState(false);
  const [failed, setFailed] = useState(() => videoKnownMissing);
  const [playing, setPlaying] = useState(false);
  const slotA = useRef<HTMLVideoElement>(null);
  const slotB = useRef<HTMLVideoElement>(null);

  const renderVideo = videoWanted && !failed && clips.length > 0;

  // Decide whether video is allowed — deferred to idle time so the first
  // paint (image only) is never delayed — and re-decide if the viewport or
  // motion preference changes.
  useEffect(() => {
    const small = window.matchMedia("(max-width: 639.98px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let cancelled = false;

    const sync = () => {
      if (cancelled) return;
      setVideoWanted(!small.matches && !reduced.matches && !connectionSaysSkipVideo());
    };

    let idleHandle: number | undefined;
    let timeoutHandle: number | undefined;
    // Safari has no requestIdleCallback — fall back to a short timeout.
    if (typeof window.requestIdleCallback === "function") {
      idleHandle = window.requestIdleCallback(sync, { timeout: 1500 });
    } else {
      timeoutHandle = window.setTimeout(sync, 250);
    }

    small.addEventListener("change", sync);
    reduced.addEventListener("change", sync);
    return () => {
      cancelled = true;
      if (idleHandle !== undefined) window.cancelIdleCallback(idleHandle);
      if (timeoutHandle !== undefined) window.clearTimeout(timeoutHandle);
      small.removeEventListener("change", sync);
      reduced.removeEventListener("change", sync);
    };
  }, []);

  // The album: drives both video slots imperatively (a clip change is
  // not something React should re-render for).
  useEffect(() => {
    const a = slotA.current;
    const b = slotB.current;
    if (!renderVideo || !a || !b) return;

    const slots = [a, b];
    const single = clips.length === 1;
    const bad = new Set<number>();
    let active = 0; // slot currently on screen
    let clipIdx = 0; // clip shown in the active slot
    let fading = false;
    let inView = true;
    let firstShown = false;
    let disposed = false;
    const timers: number[] = [];

    for (const s of slots) {
      s.muted = true; // autoplay policies require muted
      s.loop = single;
    }

    const sourceFor = (slot: HTMLVideoElement, idx: number) =>
      `${clips[idx]}.${slot.canPlayType('video/webm; codecs="vp9"') ? "webm" : "mp4"}`;

    const nextGood = (from: number): number => {
      for (let step = 1; step <= clips.length; step++) {
        const candidate = (from + step) % clips.length;
        if (!bad.has(candidate)) return candidate;
      }
      return from;
    };

    const load = (slot: HTMLVideoElement, idx: number) => {
      slot.dataset.clip = String(idx);
      slot.src = sourceFor(slot, idx);
      slot.preload = "auto";
      slot.load();
    };

    const tryPlay = (slot: HTMLVideoElement) => {
      slot.play().catch(() => {
        /* autoplay blocked — the still image stays visible */
      });
    };

    const preloadNext = () => {
      if (single) return;
      const idle = slots[1 - active];
      const target = nextGood(clipIdx);
      if (target === clipIdx) return; // nothing else to rotate to
      load(idle, target);
    };

    const crossfade = () => {
      if (fading || single || disposed) return;
      const incoming = slots[1 - active];
      const outgoing = slots[active];
      const target = Number(incoming.dataset.clip);
      // Not loaded (yet) — keep playing the current clip.
      if (incoming.readyState < 3 || bad.has(target) || !incoming.src) return;

      fading = true;
      incoming.currentTime = 0;
      tryPlay(incoming);
      incoming.classList.add("is-active", "is-top");
      outgoing.classList.remove("is-top");

      timers.push(
        window.setTimeout(() => {
          if (disposed) return;
          outgoing.classList.remove("is-active");
          outgoing.pause();
          active = 1 - active;
          clipIdx = target;
          fading = false;
          preloadNext();
        }, FADE_MS + 100)
      );
    };

    const onTimeUpdate = (e: Event) => {
      const slot = e.currentTarget as HTMLVideoElement;
      if (slot !== slots[active] || fading) return;
      const remaining = slot.duration - slot.currentTime;
      if (Number.isFinite(remaining) && remaining <= FADE_MS / 1000 + 0.2) crossfade();
    };

    // The next clip wasn't ready by the time this one ended: replay it
    // and try again on the next timeupdate.
    const onEnded = (e: Event) => {
      const slot = e.currentTarget as HTMLVideoElement;
      if (slot !== slots[active] || single) return;
      slot.currentTime = 0;
      tryPlay(slot);
    };

    const onPlaying = (e: Event) => {
      const slot = e.currentTarget as HTMLVideoElement;
      if (firstShown || slot !== slots[0]) return;
      firstShown = true;
      slot.classList.add("is-active", "is-top");
      setPlaying(true);
      preloadNext();
    };

    const onError = (e: Event) => {
      const slot = e.currentTarget as HTMLVideoElement;
      const idx = Number(slot.dataset.clip);
      if (slot.getAttribute("src") === null) return; // we cleared it ourselves
      if (!firstShown && slot === slots[0] && idx === 0) {
        // The first clip itself is missing/unplayable — give up entirely.
        videoKnownMissing = true;
        setFailed(true);
        setPlaying(false);
        return;
      }
      bad.add(idx);
      if (slot !== slots[active]) {
        // The preloaded clip failed: try the one after it instead.
        const target = nextGood(clipIdx);
        if (target !== clipIdx && !bad.has(target)) load(slot, target);
      }
    };

    for (const s of slots) {
      s.addEventListener("timeupdate", onTimeUpdate);
      s.addEventListener("ended", onEnded);
      s.addEventListener("playing", onPlaying);
      s.addEventListener("error", onError);
    }

    // Play only while visible: pause when scrolled out of view or the tab
    // is hidden, so an off-screen hero never burns CPU/battery.
    const updatePlayback = () => {
      const current = slots[active];
      if (inView && !document.hidden) {
        if (firstShown || current.src) tryPlay(current);
      } else {
        for (const s of slots) s.pause();
      }
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        updatePlayback();
      },
      { threshold: 0 }
    );
    observer.observe(a);
    document.addEventListener("visibilitychange", updatePlayback);

    // Start: only the first clip loads now.
    load(slots[0], 0);
    tryPlay(slots[0]);

    return () => {
      disposed = true;
      observer.disconnect();
      document.removeEventListener("visibilitychange", updatePlayback);
      timers.forEach((t) => window.clearTimeout(t));
      for (const s of slots) {
        s.removeEventListener("timeupdate", onTimeUpdate);
        s.removeEventListener("ended", onEnded);
        s.removeEventListener("playing", onPlaying);
        s.removeEventListener("error", onError);
        s.pause();
        s.classList.remove("is-active", "is-top");
        s.removeAttribute("src");
        s.load(); // releases the network request and decoder
      }
    };
  }, [renderVideo, clips]);

  return (
    <div
      className={`xf-drone-bg${playing && renderVideo ? " xf-drone-bg--playing" : ""}`}
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="xf-drone-bg__img"
        src={imageSrc}
        alt=""
        fetchPriority="high"
        decoding="async"
        draggable={false}
      />

      {renderVideo && (
        <>
          <video
            ref={slotA}
            className="xf-drone-bg__video"
            muted
            playsInline
            preload="none"
            disablePictureInPicture
            disableRemotePlayback
            tabIndex={-1}
          />
          <video
            ref={slotB}
            className="xf-drone-bg__video"
            muted
            playsInline
            preload="none"
            disablePictureInPicture
            disableRemotePlayback
            tabIndex={-1}
          />
        </>
      )}

      <div className="xf-drone-bg__overlay" />
    </div>
  );
}
