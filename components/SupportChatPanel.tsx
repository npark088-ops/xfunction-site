"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Headset, Send, User, X } from "lucide-react";
import { UpgradePrompt } from "./UpgradePrompt";

const bg = "var(--bg)";
const card = "var(--card)";
const border = "var(--border)";
const blue = "var(--blue)";
const green = "var(--green)";
const red = "var(--red)";
const text = "var(--text)";
const textDim = "var(--text-dim)";

type ChatMessage = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "What's included in Pro vs Free?",
  "My Canvas connection isn't working",
  "How do I report a bug?",
];

interface SupportChatContextValue {
  openPanel: () => void;
}

const SupportChatContext = createContext<SupportChatContextValue | null>(null);

// Lets any component inside SupportChatProvider (the Settings page's
// "Chat with support" button) open the same panel instance the floating
// button controls — same pattern as
// components/ConsultantPanel.tsx's useConsultantPanel().
export function useSupportChat() {
  const ctx = useContext(SupportChatContext);
  if (!ctx) {
    throw new Error("useSupportChat must be used within a SupportChatProvider");
  }
  return ctx;
}

// Deliberately a CENTERED MODAL (FocusTimer/OnboardingTour's overlay
// pattern), not a slide-out side panel like components/ConsultantPanel.tsx
// — two reasons: it keeps this visually and positionally distinct from
// Your Consultant (which already occupies the right-edge slide-out +
// bottom-right floating button), and a modal fits how support is
// actually used — a focused, usually-short exchange you finish and
// close, not something you keep open alongside a page like an ongoing
// academic chat.
export function SupportChatProvider({ children }: { children: React.ReactNode }) {
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

    fetch("/api/support-chat", {
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
    <SupportChatContext.Provider value={{ openPanel: () => setOpen(true) }}>
      {children}

      {/* Bottom-right floating button, stacked directly above Your
          Consultant's bottom-right button (bottom: 24, see
          components/ConsultantPanel.tsx) so the two read as a matched
          pair in the same corner — same size, same shadow, offset by
          this button's own height (56px) + a 12px gap = 92px from the
          bottom. Distinguished by color (green vs Consultant's blue)
          and icon (Headset vs Bot) so they're never confused at a
          glance. Previously lived bottom-left, which overlapped the
          sidebar's sign-out button (the sidebar's footer content is
          flex-pinned to the bottom of its own 100vh-tall column, i.e.
          the actual bottom-left of the viewport) — bottom-right avoids
          the sidebar entirely, since the sidebar only occupies the left
          edge. Also still reachable from the Settings page's "Support"
          card via useSupportChat(). */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close Support" : "Get support"}
        aria-expanded={open}
        title="Support"
        className="xf-tap-target"
        style={{
          position: "fixed",
          bottom: 92,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: green,
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
        {open ? <X size={22} strokeWidth={2} /> : <Headset size={22} strokeWidth={2} />}
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1050,
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: card,
              border: `1px solid ${border}`,
              borderRadius: "var(--radius-xl)",
              boxShadow: "var(--shadow-lg)",
              width: "100%",
              maxWidth: 480,
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
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
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: green,
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Headset size={16} strokeWidth={2} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: textDim, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    XFunction
                  </div>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: text, margin: 0 }}>Support</h2>
                </div>
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

            <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 20, minHeight: 240 }}>
              {messages.length === 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
                    Hi — I can help with billing, how a feature works, connection troubleshooting, or
                    reporting a bug. For questions about your grades or coursework, use{" "}
                    <strong>Your Consultant</strong> instead — that&apos;s a separate assistant for
                    academic help.
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
                          color: green,
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
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: m.role === "user" ? border : green,
                        color: m.role === "user" ? text : "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {m.role === "user" ? <User size={14} strokeWidth={2} /> : <Headset size={14} strokeWidth={2} />}
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
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: green,
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Headset size={14} strokeWidth={2} />
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

                {error?.kind === "upgrade" && <UpgradePrompt message={error.message} context="support" />}
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
                placeholder="Ask about billing, features, or connections…"
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
                  background: green,
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
        </div>
      )}
    </SupportChatContext.Provider>
  );
}
