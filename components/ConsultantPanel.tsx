"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Bot, Send, User, MessageCircle, X } from "lucide-react";
import { UpgradePrompt } from "./UpgradePrompt";

const bg = "var(--bg)";
const card = "var(--card)";
const border = "var(--border)";
const blue = "var(--blue)";
const red = "var(--red)";
const text = "var(--text)";
const textDim = "var(--text-dim)";

type ChatMessage = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "What should I focus on this week?",
  "Am I going to pass US History?",
  "Why did my grade drop in Algebra II?",
];

interface ConsultantPanelContextValue {
  open: boolean;
  openPanel: () => void;
}

const ConsultantPanelContext = createContext<ConsultantPanelContextValue | null>(null);

// Lets any component inside ConsultantPanelProvider (e.g. the sidebar's
// "Your Consultant" nav item) open the same panel instance the floating
// button controls, instead of each entry point owning separate state.
// Sidebar-triggered opens only ever need to open (never toggle/close) —
// clicking a nav item that's already showing the panel should just leave
// it open, not close it.
export function useConsultantPanel() {
  const ctx = useContext(ConsultantPanelContext);
  if (!ctx) {
    throw new Error("useConsultantPanel must be used within a ConsultantPanelProvider");
  }
  return ctx;
}

// Wraps the signed-in app content (see app/(dashboard)/layout.tsx),
// same "mounted once per app visit, not per page" pattern as ToastWatcher
// — so the floating button and panel are reachable from every signed-in
// page, and the chat history survives client-side navigation between
// pages instead of resetting each time (still session-only: it lives in
// this component's state, not persisted anywhere, so a hard refresh
// starts fresh, same as the old dedicated /ask page's behavior).
export function ConsultantPanelProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ kind: "error" | "upgrade"; message: string } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, open]);

  // Closes on Escape, same convention as other overlays in the app
  // (NotificationBell dropdown, FocusTimer, OnboardingTour).
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  const sendMessage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const next = [...messages, { role: "user" as const, content: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setError(null);

    fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: next }),
    })
      .then((res) => res.json().then((data) => ({ ok: res.ok, status: res.status, data })))
      .then(({ ok, status, data }) => {
        if (!ok) {
          setError({
            kind: status === 402 ? "upgrade" : "error",
            message: data.message || data.error || "Failed to get a response",
          });
          return;
        }
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      })
      .catch(() => setError({ kind: "error", message: "Failed to get a response" }))
      .finally(() => setLoading(false));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <ConsultantPanelContext.Provider value={{ open, openPanel: () => setOpen(true) }}>
      {children}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close Your Consultant" : "Open Your Consultant"}
        aria-expanded={open}
        className="xf-consultant-fab xf-tap-target"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: blue,
          color: "white",
          border: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "var(--shadow-lg)",
          cursor: "pointer",
          zIndex: 950,
        }}
      >
        {open ? <X size={22} strokeWidth={2} /> : <MessageCircle size={22} strokeWidth={2} />}
      </button>

      <div
        onClick={() => setOpen(false)}
        className={`xf-consultant-backdrop${open ? " xf-consultant-backdrop-open" : ""}`}
      />

      <div
        className={`xf-consultant-panel${open ? " xf-consultant-panel-open" : ""}`}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 400,
          maxWidth: "100vw",
          background: card,
          borderLeft: `1px solid ${border}`,
          boxShadow: "var(--shadow-lg)",
          zIndex: 900,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 20px",
            borderBottom: `1px solid ${border}`,
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: textDim, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              XFunction
            </div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: text, margin: 0 }}>Your Consultant</h2>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="xf-tap-target"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: "var(--radius-sm)",
              border: "none",
              background: "transparent",
              color: textDim,
              cursor: "pointer",
            }}
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {messages.length === 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    background: blue,
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Bot size={16} strokeWidth={2} />
                </div>
                <div
                  style={{
                    background: bg,
                    border: `1px solid ${border}`,
                    borderRadius: "var(--radius-md)",
                    padding: "12px 16px",
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: text,
                  }}
                >
                  Hey — I can see your real grades, categories, and upcoming assignments across all
                  your courses. What do you want to know?
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginLeft: 40 }}>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => sendMessage(s)}
                    style={{
                      alignSelf: "flex-start",
                      background: "transparent",
                      border: `1px solid ${border}`,
                      borderRadius: 999,
                      padding: "8px 14px",
                      fontSize: 13,
                      fontWeight: 600,
                      color: blue,
                      cursor: "pointer",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  flexDirection: m.role === "user" ? "row-reverse" : "row",
                }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    background: m.role === "user" ? border : blue,
                    color: m.role === "user" ? text : "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {m.role === "user" ? <User size={15} strokeWidth={2} /> : <Bot size={16} strokeWidth={2} />}
                </div>
                <div
                  style={{
                    maxWidth: "80%",
                    background: m.role === "user" ? blue : bg,
                    color: m.role === "user" ? "white" : text,
                    border: m.role === "user" ? "none" : `1px solid ${border}`,
                    borderRadius: "var(--radius-md)",
                    padding: "12px 16px",
                    fontSize: 14,
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    background: blue,
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Bot size={16} strokeWidth={2} />
                </div>
                <div
                  style={{
                    background: bg,
                    border: `1px solid ${border}`,
                    borderRadius: "var(--radius-md)",
                    padding: "12px 16px",
                    display: "flex",
                    gap: 6,
                  }}
                >
                  <div className="xf-skeleton" style={{ width: 8, height: 8, borderRadius: "50%" }} />
                  <div className="xf-skeleton" style={{ width: 8, height: 8, borderRadius: "50%" }} />
                  <div className="xf-skeleton" style={{ width: 8, height: 8, borderRadius: "50%" }} />
                </div>
              </div>
            )}

            {error?.kind === "upgrade" && <UpgradePrompt message={error.message} context="chat" />}
            {error?.kind === "error" && (
              <div style={{ color: red, fontSize: 13, padding: "0 4px" }}>{error.message}</div>
            )}
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${border}`, padding: 16, display: "flex", gap: 10, alignItems: "flex-end", flexShrink: 0 }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your grades, deadlines, or what to focus on…"
            rows={1}
            style={{
              flex: 1,
              resize: "none",
              padding: "10px 14px",
              borderRadius: "var(--radius-sm)",
              border: `1px solid ${border}`,
              background: bg,
              color: text,
              fontSize: 14,
              fontFamily: "inherit",
              maxHeight: 120,
            }}
          />
          <button
            type="button"
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 40,
              height: 40,
              borderRadius: "var(--radius-sm)",
              background: blue,
              color: "white",
              border: "none",
              cursor: loading || !input.trim() ? "default" : "pointer",
              opacity: loading || !input.trim() ? 0.6 : 1,
              flexShrink: 0,
            }}
          >
            <Send size={16} strokeWidth={2} />
          </button>
        </div>
      </div>
    </ConsultantPanelContext.Provider>
  );
}
