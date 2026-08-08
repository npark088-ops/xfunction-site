"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Send, User } from "lucide-react";
import { UpgradePrompt } from "../../../components/UpgradePrompt";

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

export default function AskPage() {
  // Session-only history — lives in this component's state, so it
  // survives across messages within the visit but isn't persisted
  // anywhere; navigating away and back starts fresh, same as the
  // study guide/quiz on the Grades page.
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ kind: "error" | "upgrade"; message: string } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

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
    <div
      className="xf-page-enter"
      style={{
        minHeight: "100vh",
        color: text,
        fontFamily: "Inter, sans-serif",
        padding: "48px 40px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ marginBottom: 8, color: textDim, fontSize: 13, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          XFunction · Your Consultant
        </div>
        <h1 style={{ fontSize: 34, fontWeight: 700, marginBottom: 4, letterSpacing: "-0.02em", color: text }}>
          Your Consultant
        </h1>
        <p style={{ color: textDim, marginBottom: 24, fontSize: 15 }}>
          Ask anything about your grades, courses, or what to do next — answers are grounded in your
          actual data, not generic advice.
        </p>

        <div
          className="xf-card"
          style={{
            background: card,
            border: `1px solid ${border}`,
            borderRadius: "var(--radius-lg)",
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 480,
            overflow: "hidden",
          }}
        >
          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 24 }}>
            {messages.length === 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "100%" }}>
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
                      maxWidth: "78%",
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

          <div style={{ borderTop: `1px solid ${border}`, padding: 16, display: "flex", gap: 10, alignItems: "flex-end" }}>
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
      </div>
    </div>
  );
}
