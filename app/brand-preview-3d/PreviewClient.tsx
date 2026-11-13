"use client";

import { useState } from "react";
import { DroneBackground } from "../../components/DroneBackground";
import { CONCEPTS_3D, FlatMark } from "../../components/brand3d/FlatMarks";
import { HeroMark3D } from "../../components/brand3d/HeroMark3D";
import type { Theme } from "../../components/brand3d/palette";
import "./brand-preview-3d.css";

// Same still the landing page uses behind its drone clips.
const POSTER_IMAGE = "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1600";

function FlatTiles({ n }: { n: 1 | 2 | 3 }) {
  return (
    <div className="b3-flat">
      {(["light", "dark"] as const).map((t) => (
        <div key={t} className={`b3-tile b3-${t}`}>
          <span className="b3-tile__label">Flat marks · {t}</span>
          <div className="b3-tile__row">
            <div>
              <FlatMark n={n} size={24} mono />
              <span className="b3-cap">24px · 1 colour</span>
            </div>
            <div>
              <FlatMark n={n} size={24} />
              <span className="b3-cap">24px · colour</span>
            </div>
            <div>
              <FlatMark n={n} size={16} mono />
              <span className="b3-cap">favicon 16</span>
            </div>
            <div>
              <span className="b3-appicon">
                <FlatMark n={n} size={40} mono />
              </span>
              <span className="b3-cap">app icon</span>
            </div>
            <div>
              <FlatMark n={n} size={88} />
              <span className="b3-cap">88px</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PreviewClient() {
  const [theme, setTheme] = useState<Theme>("light");

  return (
    <div className={`b3-page b3-${theme}`}>
      <div className="b3-wrap">
        <div className="b3-top">
          <h1>3D hero mark concepts</h1>
          <div className="b3-toggle" role="group" aria-label="Colour theme">
            {(["light", "dark"] as const).map((t) => (
              <button key={t} type="button" aria-pressed={theme === t} onClick={() => setTheme(t)}>
                {t === "light" ? "Light" : "Dark"}
              </button>
            ))}
          </div>
        </div>
        <p className="b3-note">
          Three original concepts. Each is shown on the page and on the NYC drone background, followed by its flat
          one-colour version (24px, favicon, app icon). The 3D scene appears only at 1024px and wider, without
          reduced-motion or Save-Data, when WebGL works and the hero is on screen; everywhere else you see the flat
          poster. Dev-only: returns 404 in a production build. Add <code>?nowebgl</code> to the address to see the
          no-WebGL fallback.
        </p>

        {CONCEPTS_3D.map((c) => (
          <section key={c.n} id={`concept-${c.n}`} className="b3-concept" aria-labelledby={`b3-h-${c.n}`}>
            <div className="b3-head">
              <span className="b3-badge" aria-hidden="true">
                {c.n}
              </span>
              <div>
                <h2 id={`b3-h-${c.n}`}>
                  Concept {c.n} — {c.name}
                </h2>
                <p>{c.line}</p>
              </div>
            </div>

            <div className="b3-stages">
              <figure className="b3-stage b3-stage--paper">
                <HeroMark3D n={c.n} theme={theme} />
                <figcaption>On the page</figcaption>
              </figure>
              <figure className="b3-stage b3-stage--drone">
                <div className="b3-stage__bg">
                  <DroneBackground imageSrc={POSTER_IMAGE} />
                </div>
                <div className="b3-scrim" />
                <HeroMark3D n={c.n} theme={theme} />
                <figcaption>On the NYC drone background</figcaption>
              </figure>
            </div>

            <FlatTiles n={c.n} />
          </section>
        ))}
      </div>
    </div>
  );
}
