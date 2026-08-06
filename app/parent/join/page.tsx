"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { UserCheck, AlertCircle } from "lucide-react";
import { createClient } from "../../../lib/supabase/client";

const card = "var(--card)";
const border = "var(--border)";
const blue = "var(--blue)";
const green = "var(--green)";
const red = "var(--red)";
const text = "var(--text)";
const textDim = "var(--text-dim)";

// useSearchParams() needs a Suspense boundary during static generation
// — same pattern as /login.
export default function ParentJoinPage() {
  return (
    <Suspense fallback={null}>
      <JoinForm />
    </Suspense>
  );
}

function JoinForm() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");

  const [studentEmail, setStudentEmail] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  // Lazy initializer (not an effect) reads `code` — already available
  // synchronously from useSearchParams() on first render — so the "no
  // code at all" case never needs a synchronous setState from inside
  // the effect body below.
  const [previewLoading, setPreviewLoading] = useState(() => Boolean(code));

  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    const supabase = createClient();
    supabase
      .rpc("peek_parent_invite", { p_invite_code: code })
      .then(({ data, error }) => {
        setPreviewLoading(false);
        if (error || !data || data.length === 0) {
          setPreviewError("This invite link is invalid or has already been used.");
          return;
        }
        setStudentEmail(data[0].student_email);
      });
  }, [code]);

  const accept = () => {
    if (!code) return;
    setAccepting(true);
    setAcceptError(null);
    const supabase = createClient();
    supabase
      .rpc("accept_parent_invite", { p_invite_code: code })
      .then(({ data, error }) => {
        setAccepting(false);
        if (error || !data || data.length === 0) {
          setAcceptError(error?.message || "Failed to accept this invite.");
          return;
        }
        setAccepted(true);
      });
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "64px 24px" }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div
          style={{
            background: card,
            border: `1px solid ${border}`,
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-sm)",
            padding: 32,
            textAlign: "center",
          }}
        >
          {!code ? (
            <>
              <AlertCircle size={28} strokeWidth={1.5} color={textDim} style={{ marginBottom: 12 }} />
              <h1 style={{ fontSize: 18, fontWeight: 700, color: text, marginBottom: 6 }}>
                Missing invite code
              </h1>
              <p style={{ fontSize: 14, color: textDim }}>
                Use the exact link a student shared with you to link your account.
              </p>
            </>
          ) : previewLoading ? (
            <div className="xf-skeleton" style={{ height: 80 }} />
          ) : accepted ? (
            <>
              <UserCheck size={28} strokeWidth={1.5} color={green} style={{ marginBottom: 12 }} />
              <h1 style={{ fontSize: 18, fontWeight: 700, color: text, marginBottom: 6 }}>
                You&apos;re linked
              </h1>
              <p style={{ fontSize: 14, color: textDim, marginBottom: 20 }}>
                You now have read-only access to {studentEmail}&apos;s progress.
              </p>
              <Link
                href="/parent"
                style={{
                  display: "inline-block",
                  padding: "10px 20px",
                  borderRadius: "var(--radius-sm)",
                  background: blue,
                  color: "white",
                  textDecoration: "none",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                Go to parent view
              </Link>
            </>
          ) : previewError ? (
            <>
              <AlertCircle size={28} strokeWidth={1.5} color={red} style={{ marginBottom: 12 }} />
              <h1 style={{ fontSize: 18, fontWeight: 700, color: text, marginBottom: 6 }}>
                Invite not valid
              </h1>
              <p style={{ fontSize: 14, color: textDim }}>{previewError}</p>
            </>
          ) : (
            <>
              <UserCheck size={28} strokeWidth={1.5} color={blue} style={{ marginBottom: 12 }} />
              <h1 style={{ fontSize: 18, fontWeight: 700, color: text, marginBottom: 6 }}>
                You&apos;ve been invited
              </h1>
              <p style={{ fontSize: 14, color: textDim, marginBottom: 24, lineHeight: 1.6 }}>
                Link your account for read-only access to <strong style={{ color: text }}>{studentEmail}</strong>&apos;s
                overall grades, upcoming deadlines, and grade trend. You won&apos;t be able to see
                their notes or change anything.
              </p>
              <button
                onClick={accept}
                disabled={accepting}
                style={{
                  padding: "11px 24px",
                  borderRadius: "var(--radius-sm)",
                  background: blue,
                  color: "white",
                  border: "none",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: accepting ? "default" : "pointer",
                  opacity: accepting ? 0.7 : 1,
                }}
              >
                {accepting ? "Linking…" : "Accept invite"}
              </button>
              {acceptError && (
                <div style={{ fontSize: 12, color: red, marginTop: 12 }}>{acceptError}</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
