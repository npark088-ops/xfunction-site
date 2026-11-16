"use client";

import { useState } from "react";
import { CheckCircle2, AlertTriangle, Link2, Clock, BookOpen, GraduationCap, Sparkles } from "lucide-react";
import { LMS_PLATFORMS, SIS_PLATFORMS, PlatformConfig, PlatformId, PlatformPreference } from "../lib/platforms";

const bg = "var(--bg)";
const card = "var(--card)";
const border = "var(--border)";
const blue = "var(--blue)";
const green = "var(--green)";
const red = "var(--red)";
const amber = "var(--amber)";
const text = "var(--text)";
const textDim = "var(--text-dim)";

type PlatformStatus = { connected: boolean; user: { id: string | number; name: string } | null };
type PlatformBanner = { platform: PlatformId; message: string; kind: "success" | "error" };

const selectStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "var(--radius-sm)",
  border: `1px solid ${border}`,
  background: bg,
  color: text,
  fontSize: 14,
  fontWeight: 600,
  boxSizing: "border-box" as const,
};

// Two independent pickers rather than one flat list — reflects a real
// distinction in ed-tech: an LMS (Canvas, Schoology, Google Classroom,
// Moodle, Blackboard) handles day-to-day assignments/coursework and is
// realistically reachable by an individual developer; an SIS
// (PowerSchool, Infinite Campus, Skyward, StudentVUE/Synergy) is the
// official system of record for grades, gated behind district-level IT
// approval (see lib/sis-coming-soon.ts). A school commonly runs one of
// each, so a student can pick one from each dropdown — or just one, if
// their school uses a single unified platform for both.
export function PlatformConnectionsCard({
  initialStatuses,
  banner,
  preferredPlatform = null,
}: {
  initialStatuses: Partial<Record<PlatformId, PlatformStatus>>;
  banner: PlatformBanner | null;
  preferredPlatform?: PlatformPreference;
}) {
  const [statuses, setStatuses] = useState(initialStatuses);

  const preferredLms = LMS_PLATFORMS.find((p) => p.id === preferredPlatform);
  const preferredSis = SIS_PLATFORMS.find((p) => p.id === preferredPlatform);

  // Priority: an explicit banner (just came back from a connect flow)
  // beats the signup answer, which beats "already connected," which
  // beats the plain first-in-list default.
  const [selectedLms, setSelectedLms] = useState<PlatformId>(() => {
    if (banner && LMS_PLATFORMS.some((p) => p.id === banner.platform)) return banner.platform;
    if (preferredLms) return preferredLms.id;
    const connected = LMS_PLATFORMS.find((p) => initialStatuses[p.id]?.connected);
    return connected?.id ?? LMS_PLATFORMS[0].id;
  });
  const [selectedSis, setSelectedSis] = useState<PlatformId>(preferredSis?.id ?? SIS_PLATFORMS[0].id);

  const refreshStatus = (platform: PlatformConfig) => {
    if (!platform.statusHref) return;
    fetch(platform.statusHref)
      .then((res) => res.json())
      .then((data: PlatformStatus) =>
        setStatuses((prev) => ({ ...prev, [platform.id]: data }))
      )
      .catch(() =>
        setStatuses((prev) => ({ ...prev, [platform.id]: { connected: false, user: null } }))
      );
  };

  const disconnect = (platform: PlatformConfig) => {
    if (!platform.disconnectHref) return;
    fetch(platform.disconnectHref, { method: "POST" }).then(() => refreshStatus(platform));
  };

  const lmsPlatform = LMS_PLATFORMS.find((p) => p.id === selectedLms)!;
  const sisPlatform = SIS_PLATFORMS.find((p) => p.id === selectedSis)!;

  const renderAvailableDetail = (platform: PlatformConfig) => {
    const status = statuses[platform.id] ?? { connected: false, user: null };
    const platformBanner = banner?.platform === platform.id ? banner : null;

    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          {status.connected ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600, color: green, marginBottom: 2 }}>
                <CheckCircle2 size={16} strokeWidth={2} />
                {platform.name} connected
              </div>
              <div style={{ fontSize: 13, color: textDim }}>
                Signed in as {status.user?.name}. {platform.connectedCopy}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 14, fontWeight: 600, color: text, marginBottom: 2 }}>
                {platform.name} not connected
              </div>
              <div style={{ fontSize: 13, color: textDim, maxWidth: 440 }}>{platform.notConnectedCopy}</div>
            </>
          )}
          {platformBanner && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                color: platformBanner.kind === "success" ? green : red,
                marginTop: 6,
              }}
            >
              {platformBanner.kind === "success" ? (
                <CheckCircle2 size={13} strokeWidth={2} />
              ) : (
                <AlertTriangle size={13} strokeWidth={2} />
              )}
              {platformBanner.message}
            </div>
          )}
        </div>

        {status.connected ? (
          <button
            onClick={() => disconnect(platform)}
            style={{
              padding: "10px 20px",
              borderRadius: "var(--radius-sm)",
              background: bg,
              border: `1px solid ${border}`,
              color: text,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            Disconnect
          </button>
        ) : (
          <a
            href={platform.connectHref ?? "#"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              borderRadius: "var(--radius-sm)",
              background: blue,
              color: "white",
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            <Link2 size={15} strokeWidth={2} />
            Connect {platform.name}
          </a>
        )}
      </div>
    );
  };

  const renderComingSoonDetail = (platform: PlatformConfig) => (
    <div style={{ fontSize: 13, color: textDim, lineHeight: 1.6, maxWidth: 480 }}>
      {platform.comingSoonCopy}
    </div>
  );

  return (
    <div
      className="xf-card"
      style={{
        background: card,
        border: `1px solid ${border}`,
        borderRadius: "var(--radius-lg)",
        padding: 20,
        marginBottom: 24,
      }}
    >
      <h2 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 2px", color: text }}>
        Connect your platform
      </h2>
      <p style={{ fontSize: 13, color: textDim, margin: preferredPlatform ? "0 0 8px" : "0 0 20px" }}>
        Schools often run one system for coursework and a separate one for official grades — pick
        whichever applies to your school in each category below.
      </p>
      {preferredPlatform === "other" && (
        <p style={{ fontSize: 12, color: textDim, margin: "0 0 20px", fontStyle: "italic" }}>
          You told us your school uses something else — pick whichever option below is the closest match.
        </p>
      )}
      {preferredPlatform === "not-sure" && (
        <p style={{ fontSize: 12, color: textDim, margin: "0 0 20px", fontStyle: "italic" }}>
          Not sure which one your school uses? Check your school&apos;s login page, or ask a teacher —
          then pick it below.
        </p>
      )}

      <div className="xf-grid-collapse" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* LMS — available */}
        <div style={{ border: `1px solid ${border}`, borderRadius: "var(--radius-md)", padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: text }}>
              <BookOpen size={14} strokeWidth={2} />
              Assignments &amp; coursework
            </div>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 11,
                fontWeight: 700,
                color: green,
                background: "rgba(34, 197, 94, 0.12)",
                border: `1px solid ${green}`,
                borderRadius: 999,
                padding: "2px 8px",
                textTransform: "uppercase",
                letterSpacing: "0.03em",
              }}
            >
              <CheckCircle2 size={11} strokeWidth={2} />
              Available
            </span>
          </div>
          <p style={{ fontSize: 12, color: textDim, margin: "0 0 12px" }}>
            LMS — day-to-day assignments and coursework. Realistically reachable by an individual
            developer, so every option here has a working connect flow.
          </p>

          <select
            value={selectedLms}
            onChange={(e) => setSelectedLms(e.target.value as PlatformId)}
            style={{ ...selectStyle, marginBottom: preferredLms?.id === selectedLms ? 8 : 14 }}
          >
            {LMS_PLATFORMS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {statuses[p.id]?.connected ? " — connected" : ""}
              </option>
            ))}
          </select>

          {preferredLms?.id === selectedLms && !statuses[selectedLms]?.connected && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11,
                fontWeight: 700,
                color: blue,
                marginBottom: 10,
              }}
            >
              <Sparkles size={11} strokeWidth={2} />
              Suggested based on what you told us at signup
            </div>
          )}

          {renderAvailableDetail(lmsPlatform)}
        </div>

        {/* SIS — coming soon */}
        <div style={{ border: `1px dashed ${border}`, borderRadius: "var(--radius-md)", padding: 16, background: bg }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: text }}>
              <GraduationCap size={14} strokeWidth={2} />
              Grades &amp; records
            </div>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 11,
                fontWeight: 700,
                color: amber,
                background: "rgba(245, 166, 35, 0.14)",
                border: `1px solid ${amber}`,
                borderRadius: 999,
                padding: "2px 8px",
                textTransform: "uppercase",
                letterSpacing: "0.03em",
              }}
            >
              <Clock size={11} strokeWidth={2} />
              Coming soon
            </span>
          </div>
          <p style={{ fontSize: 12, color: textDim, margin: "0 0 12px" }}>
            SIS — the official system of record for grades/transcripts. Every option here needs
            your school district's IT to approve access first.
          </p>

          <select
            value={selectedSis}
            onChange={(e) => setSelectedSis(e.target.value as PlatformId)}
            style={{ ...selectStyle, marginBottom: preferredSis?.id === selectedSis ? 8 : 14, color: textDim }}
          >
            {SIS_PLATFORMS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {preferredSis?.id === selectedSis && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11,
                fontWeight: 700,
                color: blue,
                marginBottom: 10,
              }}
            >
              <Sparkles size={11} strokeWidth={2} />
              Suggested based on what you told us at signup
            </div>
          )}

          {renderComingSoonDetail(sisPlatform)}
        </div>
      </div>
    </div>
  );
}
