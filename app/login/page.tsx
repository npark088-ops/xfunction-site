"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "../../lib/supabase/client";

const bg = "#0B1120";
const card = "#141B2E";
const border = "#232C45";
const cyan = "#5EEAD4";
const red = "#F16565";
const textDim = "#8B94AC";

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: `1px solid ${border}`,
  background: bg,
  color: "white",
  fontSize: 14,
  boxSizing: "border-box" as const,
};

type Mode = "sign-in" | "sign-up";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/overview";

  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(() =>
    searchParams.get("error") === "confirmation_failed"
      ? "That confirmation link is invalid or expired. Try signing up again."
      : null
  );
  const [info, setInfo] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    const supabase = createClient();

    if (mode === "sign-in") {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        console.error("Sign in failed:", error);
        setError(error.message);
        return;
      }
      console.log("Sign in succeeded, session:", data.session ? "present" : "MISSING");
      // A hard navigation (not router.push) so the request that loads
      // /app is guaranteed to carry the just-written session cookie —
      // router.push can fire before the browser client's async cookie
      // write lands, which proxy.ts then reads as "not signed in" and
      // bounces straight back to /login.
      window.location.href = next;
      return;
    }

    // sign-up. The stock "Confirm signup" template's link goes to
    // Supabase's own hosted /auth/v1/verify first (we can't edit that
    // template without custom SMTP), which then redirects the browser
    // to emailRedirectTo with a PKCE `?code=` query param — so this
    // needs to point at /auth/callback (exchangeCodeForSession), not
    // /auth/confirm (that one's for a token_hash param, which only
    // shows up if the template itself is customized to include it).
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setLoading(false);
    if (error) {
      console.error("Sign up failed:", error, "status:", error.status, "code:", error.code);
      setError(error.message);
      return;
    }
    if (data.session) {
      // Email confirmation is disabled on this project — session starts immediately.
      window.location.href = next;
      return;
    }
    setInfo("Check your email for a confirmation link to finish creating your account.");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: bg,
        color: "white",
        fontFamily: "Inter, sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div style={{ width: "100%", maxWidth: 380 }}>
        <Link
          href="/"
          style={{
            display: "inline-block",
            color: cyan,
            textDecoration: "none",
            fontSize: 14,
            fontWeight: 600,
            marginBottom: 20,
          }}
        >
          ← Back to Home
        </Link>

        <div
          style={{
            background: card,
            border: `1px solid ${border}`,
            borderRadius: 16,
            padding: 28,
          }}
        >
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
            {mode === "sign-in" ? "Sign in" : "Create your account"}
          </h1>
          <p style={{ color: textDim, fontSize: 14, marginBottom: 24 }}>
            {mode === "sign-in"
              ? "Sign in to sync your Canvas grades and tasks."
              : "Set up an account to save your tasks and Canvas connection."}
          </p>

          <form onSubmit={handleSubmit}>
            <label style={{ fontSize: 13, color: textDim, display: "block", marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ ...inputStyle, marginBottom: 16 }}
            />

            <label style={{ fontSize: 13, color: textDim, display: "block", marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ ...inputStyle, marginBottom: 20 }}
            />

            {error && (
              <div style={{ color: red, fontSize: 13, marginBottom: 16 }}>{error}</div>
            )}
            {info && (
              <div style={{ color: cyan, fontSize: 13, marginBottom: 16 }}>{info}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: 10,
                background: cyan,
                color: "#0B1120",
                border: "none",
                fontSize: 14,
                fontWeight: 700,
                cursor: loading ? "default" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create account"}
            </button>
          </form>

          <div style={{ marginTop: 20, fontSize: 13, color: textDim, textAlign: "center" }}>
              {mode === "sign-in" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <button
                    onClick={() => {
                      setMode("sign-up");
                      setError(null);
                      setInfo(null);
                    }}
                    style={{ background: "none", border: "none", color: cyan, cursor: "pointer", fontSize: 13 }}
                  >
                    Create one
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    onClick={() => {
                      setMode("sign-in");
                      setError(null);
                      setInfo(null);
                    }}
                    style={{ background: "none", border: "none", color: cyan, cursor: "pointer", fontSize: 13 }}
                  >
                    Sign in
                  </button>
                </>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
