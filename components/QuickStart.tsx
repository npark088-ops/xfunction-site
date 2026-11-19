"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ClipboardPaste, Trash2, Sparkles } from "lucide-react";
import {
  QS_LIMITS,
  balanceWeights,
  normalizeQuickStart,
  totalWeight,
  weightsAddUp,
  type QsCourse,
  type QsWarning,
} from "../lib/quick-start";
import { TIMEZONE_HEADER, browserTimeZone, localDate } from "../lib/local-date";

// The Quick Start screen (app/(dashboard)/start). Four steps, one main button
// each: paste -> (reading) -> review and edit -> (saving) -> Today.
//
// Nothing is saved until "Confirm and save". The pasted text lives only in this
// component's state: it is not put in localStorage, the URL or any log, and the
// server doesn't keep it either. Styles: the "Quick Start" block in app/app.css.

type Step = "paste" | "reading" | "review" | "saving";

type Problem = { message: string; kind: "limit" | "error" } | null;

const SAMPLE_HINT =
  "For example:\nAP Biology: tests 40%, labs 30%, homework 20%, quizzes 10%.\nLab report due next Friday (50 points).\nUnit 3 test on Nov 21 (100 points).";

export function QuickStart({ welcome = false }: { welcome?: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("paste");
  const [text, setText] = useState("");
  const [problem, setProblem] = useState<Problem>(null);
  const [courses, setCourses] = useState<QsCourse[]>([]);
  const [warnings, setWarnings] = useState<QsWarning[]>([]);
  const [demoBusy, setDemoBusy] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);
  const requestId = useRef(0);

  const today = useMemo(() => localDate(browserTimeZone()), []);

  // The same strict check the server runs on Confirm, so the student sees
  // problems here first.
  const check = useMemo(
    () => (courses.length > 0 ? normalizeQuickStart({ courses }, { today, mode: "strict" }) : null),
    [courses, today]
  );
  const blockingMessage = check && !check.ok ? check.message : null;

  const tooLong = text.length > QS_LIMITS.maxChars;

  // ------------------------------------------------------------ actions

  const readText = async () => {
    setProblem(null);
    setStep("reading");
    const mine = ++requestId.current;
    try {
      const res = await fetch("/api/quick-start/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json", [TIMEZONE_HEADER]: browserTimeZone() },
        body: JSON.stringify({ text }),
      });
      const data = await res.json().catch(() => ({}));
      if (mine !== requestId.current) return;
      if (!res.ok) {
        setProblem({
          message: data.message || "I couldn't read that just now. Please try again.",
          kind: res.status === 402 || res.status === 429 ? "limit" : "error",
        });
        setStep("paste");
        return;
      }
      setCourses(data.courses as QsCourse[]);
      setWarnings((data.warnings ?? []) as QsWarning[]);
      setStep("review");
    } catch {
      if (mine !== requestId.current) return;
      setProblem({ message: "I couldn't read that just now. Please check your connection and try again.", kind: "error" });
      setStep("paste");
    }
  };

  const save = async () => {
    setProblem(null);
    setStep("saving");
    try {
      const res = await fetch("/api/quick-start/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json", [TIMEZONE_HEADER]: browserTimeZone() },
        body: JSON.stringify({ courses }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setProblem({ message: data.message || "Couldn't save your classes. Nothing was changed.", kind: "error" });
        setStep("review");
        return;
      }
      router.push(`/today?quickstart=${data.courses}-${data.assignments}`);
    } catch {
      setProblem({ message: "Couldn't save your classes. Nothing was changed. Please try again.", kind: "error" });
      setStep("review");
    }
  };

  const loadDemo = async () => {
    setDemoBusy(true);
    setDemoError(null);
    try {
      const res = await fetch("/api/courses/seed-demo", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDemoError(data.error || "Couldn't load the demo data.");
        setDemoBusy(false);
        return;
      }
      router.push("/today");
    } catch {
      setDemoError("Couldn't load the demo data.");
      setDemoBusy(false);
    }
  };

  const startOver = () => {
    requestId.current++;
    setCourses([]);
    setWarnings([]);
    setProblem(null);
    setStep("paste");
  };

  // ------------------------------------------------------------ editing helpers

  const updateCourse = (ci: number, fn: (c: QsCourse) => QsCourse) =>
    setCourses((prev) => prev.map((c, i) => (i === ci ? fn(c) : c)));

  const renameCategory = (ci: number, ki: number, name: string) =>
    updateCourse(ci, (c) => {
      const old = c.categories[ki].name;
      return {
        ...c,
        categories: c.categories.map((k, i) => (i === ki ? { ...k, name } : k)),
        // assignments follow the rename
        assignments: c.assignments.map((a) => (a.category === old ? { ...a, category: name } : a)),
      };
    });

  const deleteCategory = (ci: number, ki: number) =>
    updateCourse(ci, (c) => {
      const gone = c.categories[ki].name;
      const rest = c.categories.filter((_, i) => i !== ki);
      const fallback = rest[0]?.name;
      return {
        ...c,
        categories: rest,
        assignments: c.assignments.map((a) => (a.category === gone && fallback ? { ...a, category: fallback } : a)),
      };
    });

  // ------------------------------------------------------------ shared pieces

  const fallbackLinks = (
    <div className="qs-fallbacks">
      <Link href="/courses" className="xf-link">
        Add classes by hand
      </Link>
      <button type="button" className="xf-link" onClick={loadDemo} disabled={demoBusy}>
        {demoBusy ? "Loading…" : "Load demo data"}
      </button>
      {demoError && (
        <p className="qs-error" role="alert">
          {demoError}
        </p>
      )}
    </div>
  );

  // ------------------------------------------------------------ the steps

  if (step === "reading" || step === "saving") {
    return (
      <section className="xf-surface qs-card" aria-busy="true">
        <p className="qs-status" role="status">
          <span className="qs-spinner" aria-hidden="true" />
          {step === "reading" ? "Reading your text…" : "Saving your classes…"}
        </p>
        <p className="qs-hint">{step === "reading" ? "This usually takes a few seconds." : "Almost done."}</p>
      </section>
    );
  }

  if (step === "paste") {
    return (
      <section className="xf-surface qs-card" aria-labelledby="qs-paste-title">
        <p className="xf-eyebrow">Step 1 of 2</p>
        <h2 id="qs-paste-title" className="qs-title">
          {welcome ? "Welcome! Add your classes in a minute" : "Paste your classes"}
        </h2>
        <p className="qs-lead">
          Paste a syllabus, a list of your classes, or what&apos;s due. I&apos;ll turn it into classes and assignments you can check
          before anything is saved.
        </p>

        <label htmlFor="qs-text" className="qs-label">
          Your text
        </label>
        <textarea
          id="qs-text"
          className="qs-input qs-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={SAMPLE_HINT}
          rows={9}
          aria-describedby="qs-count qs-privacy"
          aria-invalid={tooLong}
        />
        <div className="qs-meta">
          <span id="qs-count" className={tooLong ? "qs-count qs-count--over" : "qs-count"}>
            {text.length.toLocaleString("en-US")} / {QS_LIMITS.maxChars.toLocaleString("en-US")}
          </span>
          <span id="qs-privacy" className="qs-hint">
            What you paste is not saved. Only the classes you confirm are.
          </span>
        </div>
        {tooLong && (
          <p className="qs-error" role="alert">
            That&apos;s too long. Please keep it under {QS_LIMITS.maxChars.toLocaleString("en-US")} characters.
          </p>
        )}

        {problem && (
          <div className={problem.kind === "limit" ? "qs-notice qs-notice--limit" : "qs-notice"} role="alert">
            <AlertTriangle size={18} strokeWidth={2} aria-hidden="true" />
            <div>
              <p>{problem.message}</p>
              {fallbackLinks}
            </div>
          </div>
        )}

        <div className="qs-actions">
          <button type="button" className="xf-btn" onClick={readText} disabled={text.trim().length < 10 || tooLong}>
            <ClipboardPaste size={16} strokeWidth={2} aria-hidden="true" />
            Read my classes
          </button>
          {!problem && fallbackLinks}
        </div>
      </section>
    );
  }

  // ---- review
  return (
    <section className="qs-review" aria-labelledby="qs-review-title">
      <div className="xf-surface qs-card">
        <p className="xf-eyebrow">Step 2 of 2</p>
        <h2 id="qs-review-title" className="qs-title">
          Check your classes
        </h2>
        <p className="qs-lead">
          Fix anything that&apos;s wrong, delete what you don&apos;t want, then confirm. Nothing is saved until you do.
        </p>

        {warnings.length > 0 && (
          <div className="qs-notice" role="status">
            <AlertTriangle size={18} strokeWidth={2} aria-hidden="true" />
            <div>
              <p>
                <strong>Please double-check:</strong>
              </p>
              <ul className="qs-warnings">
                {warnings
                  .filter((w) => w.code !== "weights-not-100")
                  .map((w, i) => (
                    <li key={i}>{w.message}</li>
                  ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {courses.map((course, ci) => {
        const sum = totalWeight(course);
        const ok = weightsAddUp(course);
        return (
          <details key={ci} className="xf-surface qs-course" open={ci === 0 || courses.length <= 2}>
            <summary>
              <span className="qs-course__name">{course.name || "Untitled class"}</span>
              <span className="qs-course__count">
                {course.assignments.length} assignment{course.assignments.length === 1 ? "" : "s"}
              </span>
            </summary>

            <div className="qs-course__body">
              <label className="qs-label" htmlFor={`qs-cname-${ci}`}>
                Class name
              </label>
              <input
                id={`qs-cname-${ci}`}
                className="qs-input"
                value={course.name}
                maxLength={QS_LIMITS.maxCourseName}
                onChange={(e) => updateCourse(ci, (c) => ({ ...c, name: e.target.value }))}
              />

              <fieldset className="qs-fieldset">
                <legend className="qs-legend">Grade categories</legend>
                {course.categories.length === 0 && <p className="qs-hint">No categories.</p>}
                {course.categories.map((cat, ki) => (
                  <div key={ki} className="qs-row">
                    <input
                      className="qs-input"
                      aria-label={`Category name, ${course.name}`}
                      value={cat.name}
                      maxLength={QS_LIMITS.maxCategoryName}
                      onChange={(e) => renameCategory(ci, ki, e.target.value)}
                    />
                    <div className="qs-weight">
                      <input
                        className="qs-input"
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={100}
                        step={0.1}
                        aria-label={`Weight in percent for ${cat.name || "category"}`}
                        value={Number.isFinite(cat.weight) ? cat.weight : ""}
                        onChange={(e) =>
                          updateCourse(ci, (c) => ({
                            ...c,
                            categories: c.categories.map((k, i) =>
                              i === ki ? { ...k, weight: e.target.value === "" ? NaN : Number(e.target.value) } : k
                            ),
                          }))
                        }
                      />
                      <span aria-hidden="true">%</span>
                    </div>
                    <button
                      type="button"
                      className="qs-icon-btn"
                      aria-label={`Delete category ${cat.name || ""}`}
                      onClick={() => deleteCategory(ci, ki)}
                      disabled={course.categories.length === 1 && course.assignments.length > 0}
                    >
                      <Trash2 size={16} strokeWidth={2} aria-hidden="true" />
                    </button>
                  </div>
                ))}
                {course.categories.length > 0 && (
                  <p className={ok ? "qs-total" : "qs-total qs-total--warn"} role="status">
                    {ok ? (
                      <>Weights add up to {sum}%.</>
                    ) : (
                      <>
                        <AlertTriangle size={14} strokeWidth={2.25} aria-hidden="true" /> Weights add up to {sum}%, not 100%.{" "}
                        <button type="button" className="xf-link" onClick={() => updateCourse(ci, (c) => balanceWeights(c))}>
                          Make them add up to 100
                        </button>
                      </>
                    )}
                  </p>
                )}
              </fieldset>

              <fieldset className="qs-fieldset">
                <legend className="qs-legend">Assignments</legend>
                {course.assignments.length === 0 && <p className="qs-hint">No assignments found for this class.</p>}
                {course.assignments.map((a, ai) => (
                  <div key={ai} className="qs-assignment">
                    <div className="qs-row">
                      <input
                        className="qs-input"
                        aria-label={`Assignment title in ${course.name}`}
                        value={a.title}
                        maxLength={QS_LIMITS.maxTitle}
                        onChange={(e) =>
                          updateCourse(ci, (c) => ({
                            ...c,
                            assignments: c.assignments.map((x, i) => (i === ai ? { ...x, title: e.target.value } : x)),
                          }))
                        }
                      />
                      <button
                        type="button"
                        className="qs-icon-btn"
                        aria-label={`Delete assignment ${a.title}`}
                        onClick={() =>
                          updateCourse(ci, (c) => ({ ...c, assignments: c.assignments.filter((_, i) => i !== ai) }))
                        }
                      >
                        <Trash2 size={16} strokeWidth={2} aria-hidden="true" />
                      </button>
                    </div>
                    <div className="qs-grid3">
                      <label className="qs-mini">
                        <span>Due</span>
                        <input
                          className="qs-input"
                          type="date"
                          value={a.dueDate ?? ""}
                          onChange={(e) =>
                            updateCourse(ci, (c) => ({
                              ...c,
                              assignments: c.assignments.map((x, i) => (i === ai ? { ...x, dueDate: e.target.value || null } : x)),
                            }))
                          }
                        />
                      </label>
                      <label className="qs-mini">
                        <span>Points</span>
                        <input
                          className="qs-input"
                          type="number"
                          inputMode="decimal"
                          min={1}
                          max={QS_LIMITS.maxPoints}
                          step={0.5}
                          value={Number.isFinite(a.points) ? a.points : ""}
                          onChange={(e) =>
                            updateCourse(ci, (c) => ({
                              ...c,
                              assignments: c.assignments.map((x, i) =>
                                i === ai ? { ...x, points: e.target.value === "" ? NaN : Number(e.target.value) } : x
                              ),
                            }))
                          }
                        />
                      </label>
                      <label className="qs-mini">
                        <span>Category</span>
                        <select
                          className="qs-input"
                          value={a.category}
                          onChange={(e) =>
                            updateCourse(ci, (c) => ({
                              ...c,
                              assignments: c.assignments.map((x, i) => (i === ai ? { ...x, category: e.target.value } : x)),
                            }))
                          }
                        >
                          {course.categories.map((k, ki) => (
                            <option key={ki} value={k.name}>
                              {k.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>
                ))}
              </fieldset>

              <button
                type="button"
                className="qs-delete-course"
                onClick={() => setCourses((prev) => prev.filter((_, i) => i !== ci))}
              >
                <Trash2 size={15} strokeWidth={2} aria-hidden="true" /> Delete this class
              </button>
            </div>
          </details>
        );
      })}

      <div className="xf-surface qs-card qs-confirm">
        {problem && (
          <p className="qs-error" role="alert">
            {problem.message}
          </p>
        )}
        {blockingMessage && (
          <p className="qs-error" role="alert">
            {blockingMessage}
          </p>
        )}
        {courses.length === 0 && <p className="qs-hint">You deleted everything. Start over to paste again.</p>}
        <div className="qs-actions">
          <button type="button" className="xf-btn" onClick={save} disabled={!check || !check.ok}>
            <Sparkles size={16} strokeWidth={2} aria-hidden="true" />
            Confirm and save
          </button>
          <button type="button" className="xf-link" onClick={startOver}>
            Start over
          </button>
        </div>
      </div>
    </section>
  );
}
