"use client";

import { useEffect, useRef, useState } from "react";

type VideoSource = { src: string; type: string };

// Both are optional. webm is listed first so browsers that support it
// take the smaller file; the mp4 is the universal fallback. If neither
// file exists the component simply keeps showing the still image.
const DEFAULT_SOURCES: VideoSource[] = [
  { src: "/videos/city-drone.webm", type: "video/webm" },
  { src: "/videos/city-drone.mp4", type: "video/mp4" },
];

// Once the video has failed to load in this tab (e.g. the files haven't
// been added yet), don't retry on every client-side navigation back to a
// page that uses this component.
let videoKnownMissing = false;

type NetworkInformationLike = { saveData?: boolean; effectiveType?: string };

function connectionSaysSkipVideo(): boolean {
  const c = (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
  return Boolean(c?.saveData) || c?.effectiveType === "slow-2g" || c?.effectiveType === "2g";
}

// A muted, looping "drone view" video behind the page content, with a
// still image as poster and fallback, and a dark gradient on top so text
// stays readable. Fill the nearest positioned ancestor (the parent must
// be `position: relative` with a defined height); it never affects
// layout or blocks clicks.
//
// Layers, bottom to top:
//   1. still image — always rendered (it is the fallback and the LCP
//      element). Slow CSS pan/zoom makes it feel alive; the animation
//      pauses once the video is actually playing, and is off entirely
//      under prefers-reduced-motion.
//   2. video — only mounted when ALL of these hold, and only after the
//      browser is idle so it never competes with first paint:
//        - viewport >= 640px wide
//        - no prefers-reduced-motion
//        - no Save-Data / 2G connection
//      It stays invisible until it reports `playing`, then fades in. If
//      the files are missing or can't play, layer 1 just carries on.
//      preload="metadata", and it pauses when scrolled out of view or
//      the tab is hidden.
//   3. dark gradient overlay.
export function DroneBackground({
  imageSrc,
  videoSources = DEFAULT_SOURCES,
}: {
  imageSrc: string;
  videoSources?: VideoSource[];
}) {
  const [videoWanted, setVideoWanted] = useState(false);
  const [failed, setFailed] = useState(() => videoKnownMissing);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const renderVideo = videoWanted && !failed;

  // Decide whether video is allowed — deferred to idle time so the
  // first paint (image only) is never delayed — and re-decide if the
  // viewport or motion preference changes.
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

  // Play only while visible: pause when scrolled out of view or the tab
  // is hidden, so an off-screen hero never burns CPU/battery.
  useEffect(() => {
    const video = videoRef.current;
    if (!renderVideo || !video) return;

    video.muted = true; // autoplay policies require muted
    let inView = true;
    const update = () => {
      if (inView && !document.hidden) {
        video.play().catch(() => {
          /* autoplay blocked — the still image stays visible */
        });
      } else {
        video.pause();
      }
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        update();
      },
      { threshold: 0 }
    );
    observer.observe(video);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, [renderVideo]);

  const lastSource = videoSources.length - 1;

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
        <video
          ref={videoRef}
          className="xf-drone-bg__video"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={imageSrc}
          disablePictureInPicture
          disableRemotePlayback
          tabIndex={-1}
          onPlaying={() => setPlaying(true)}
        >
          {videoSources.map((s, i) => (
            <source
              key={s.src}
              src={s.src}
              type={s.type}
              // The last source erroring means none of them loaded.
              onError={
                i === lastSource
                  ? () => {
                      videoKnownMissing = true;
                      setFailed(true);
                      setPlaying(false);
                    }
                  : undefined
              }
            />
          ))}
        </video>
      )}

      <div className="xf-drone-bg__overlay" />
    </div>
  );
}
