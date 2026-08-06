"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Sparkles } from "lucide-react";
import { createClient } from "../../../lib/supabase/client";

const bg = "var(--bg)";
const card = "var(--card)";
const border = "var(--border)";
const blue = "var(--blue)";
const green = "var(--green)";
const red = "var(--red)";
const text = "var(--text)";
const textDim = "var(--text-dim)";

type Task = {
  id: string;
  text: string;
  completed: boolean;
  due_date: string | null;
};

const supabase = createClient();

export default function TasksPage() {
  const [task, setTask] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [steps, setSteps] = useState<string[]>([]);
const [coachAdvice, setCoachAdvice] = useState("");
  const [aiLoading, setAiLoading] = useState<"breakdown" | "coach" | null>(null);


  useEffect(() => {
    supabase
      .from("tasks")
      .select("id, text, completed, due_date")
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          setTasksLoading(false);
          return;
        }
        setTasks(data ?? []);
        setTasksLoading(false);
      });
  }, []);

  const addTask = async () => {
    if (!task.trim()) return;

    const { data, error } = await supabase
      .from("tasks")
      .insert({ text: task, due_date: dueDate || null })
      .select("id, text, completed, due_date")
      .single();

    if (error) {
      console.error(error);
      return;
    }

    setTasks([...tasks, data]);
    setDueDate("");
  };

  const deleteTask = async (id: string) => {
    const previous = tasks;
    setTasks(tasks.filter((t) => t.id !== id));

    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) {
      console.error(error);
      setTasks(previous);
    }
  };

  const toggleTask = async (id: string) => {
    const target = tasks.find((t) => t.id === id);
    if (!target) return;

    const previous = tasks;
    setTasks(tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));

    const { error } = await supabase
      .from("tasks")
      .update({ completed: !target.completed })
      .eq("id", id);

    if (error) {
      console.error(error);
      setTasks(previous);
    }
  };

  const breakDownTask = async () => {
  if (!task.trim()) return;

  setAiLoading("breakdown");
  try {
    const response = await fetch(
      "/api/task-breakdown",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
  task,
  dueDate,
}),
      }
    );

const data = await response.json();

setSteps([data.response || "No response"]);
  } catch (error) {
    console.error(error);
  } finally {
    setAiLoading(null);
  }
};

const getCoachAdvice = async () => {
  setAiLoading("coach");
  try {
    const response = await fetch(
      "/api/task-breakdown",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          task: `
Current Tasks:

${tasks
  .map(
    (t) =>
      `${t.text} | Due: ${t.due_date ?? ""} | Completed: ${t.completed}`
  )
  .join("\n")}

Tell me:
1. Most important task
2. Why
3. What I should do right now
`,
          dueDate: "",
        }),
      }
    );

    const data = await response.json();

    setCoachAdvice(data.response);
  } catch (error) {
    console.error(error);
  } finally {
    setAiLoading(null);
  }
};


  const completedTasks = tasks.filter(
    (task) => task.completed
  ).length;

  const completionRate =
    tasks.length === 0
      ? 0
      : Math.round(
          (completedTasks / tasks.length) * 100
        );

  return (
  <div
    className="xf-page-enter"
    style={{
      color: text,
      minHeight: "100vh",
      padding: "48px 40px",
      fontFamily: "Inter, sans-serif"
     }}
  >
  <div
  style={{
    maxWidth: "1200px",
    margin: "0 auto"
  }}
>
   <div style={{ marginBottom: 8, color: textDim, fontSize: 13, letterSpacing: "0.04em", textTransform: "uppercase" }}>
     xFunction · Tasks
   </div>
   <h1
  style={{
    fontSize: 34,
    fontWeight: 700,
    letterSpacing: "-0.02em",
    marginBottom: 4,
    color: text
  }}
>
  Your tasks
</h1>

<p
  style={{
    fontSize: 15,
    color: textDim,
    marginBottom: 24,
  }}
>
  Plan less. Execute more.
</p>

      <div
        style={{
          display: "flex",
          gap: "20px",
          marginBottom: "30px",
          flexWrap: "wrap"
        }}
      >
        <div className="xf-card" style={statCard}>
          <div style={{ color: textDim, fontSize: 13 }}>Total Tasks</div>
          <div style={bigNumber}>{tasks.length}</div>
        </div>

        <div className="xf-card" style={statCard}>
          <div style={{ color: textDim, fontSize: 13 }}>Completed</div>
          <div style={bigNumber}>
            {completedTasks}
          </div>
        </div>

        <div className="xf-card" style={statCard}>
          <div style={{ color: textDim, fontSize: 13 }}>Completion Rate</div>
          <div style={{ ...bigNumber, color: green }}>
            {completionRate}%
          </div>
        </div>
      </div>

      <div
        className="xf-card"
        style={{
          background: card,
          padding: "24px",
          borderRadius: "var(--radius-lg)",
border: `1px solid ${border}`,
          marginBottom: "24px"
        }}
      >
     <h2
  style={{
    marginBottom: "15px",
    fontSize: "24px",
    fontWeight: 600
  }}
>
  New Task
</h2>

        <input
          value={task}
          onChange={(e) =>
            setTask(e.target.value)
          }
          placeholder="Enter a task..."
          style={{
            width: "100%",
            padding: "14px",
            transition: "0.2s ease",
            marginTop: "10px",
            marginBottom: "15px",
            borderRadius: "var(--radius-sm)",
           border: `1px solid ${border}`,
background: bg,
color: text,
          }}
        />

<input
  type="date"
  value={dueDate}
  onChange={(e) =>
    setDueDate(e.target.value)
  }
  style={{
    width: "100%",
    padding: "14px",
    transition: "0.2s ease",
    marginBottom: "15px",
    borderRadius: "var(--radius-sm)",
    border: `1px solid ${border}`,
background: bg,
color: text,
  }}
/>
<button
  onClick={addTask}
  style={button}
>
  <Plus size={15} strokeWidth={2.5} />
  Save Task
</button>

<button
  onClick={breakDownTask}
  disabled={aiLoading !== null}
  style={{
    ...secondaryButton,
    marginLeft: "10px",
    opacity: aiLoading === "breakdown" ? 0.7 : 1,
    cursor: aiLoading !== null ? "default" : "pointer",
  }}
>
  <Sparkles size={14} strokeWidth={2} />
  {aiLoading === "breakdown" ? "Breaking down…" : "Break Down With AI"}
</button>

<button
  onClick={getCoachAdvice}
  disabled={aiLoading !== null}
  style={{
    ...secondaryButton,
    marginLeft: "10px",
    opacity: aiLoading === "coach" ? 0.7 : 1,
    cursor: aiLoading !== null ? "default" : "pointer",
  }}
>
  <Sparkles size={14} strokeWidth={2} />
  {aiLoading === "coach" ? "Thinking…" : "Get AI Recommendation"}
</button>
      </div>

      {steps.length > 0 && (
        <div
          className="xf-card"
          style={{
            background: card,
            padding: "24px",
            borderRadius: "var(--radius-lg)",
border: `1px solid ${border}`,
            marginBottom: "24px"
          }}
        >
          <h2 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
            <Sparkles size={16} strokeWidth={2} />
            AI Breakdown
          </h2>

          {steps.map((step, index) => (
            <div
              key={index}
              style={{
               background: bg,
border: `1px solid ${border}`,
                padding: "16px",
                transition: "0.2s ease",
                borderRadius: "var(--radius-sm)",
                marginBottom: "10px"
              }}
            >
               {step}
            </div>
          ))}
        </div>
      )}



{coachAdvice && (
  <div
    className="xf-card"
    style={{
     background: card,
      padding: "24px",
      borderRadius: "var(--radius-lg)",
      marginBottom: "24px",
      border: `1px solid ${border}`
    }}
  >
    <h2 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
      <Sparkles size={16} strokeWidth={2} />
      AI Coach
    </h2>

    <div
      style={{
        whiteSpace: "pre-wrap",
        lineHeight: 1.8,
        color: textDim,
      }}
    >
      {coachAdvice}
    </div>
  </div>
)}
<div
  className="xf-card"
  style={{
 background: card,
    padding: "24px",
    borderRadius: "var(--radius-lg)",
    border: `1px solid ${border}`,
  }}
>
  <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>My Tasks</h2>

        {tasks.length === 0 && (
          tasksLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="xf-skeleton" style={{ height: 52 }} />
              <div className="xf-skeleton" style={{ height: 52 }} />
              <div className="xf-skeleton" style={{ height: 52 }} />
            </div>
          ) : (
            <p style={{ color: textDim }}>No tasks yet.</p>
          )
        )}

        {tasks.map((task) => (
          <div
            key={task.id}
            style={{
             background: bg,
border: `1px solid ${border}`,
              padding: "16px",
              transition: "0.2s ease",
              borderRadius: "var(--radius-sm)",
              marginBottom: "10px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <div>
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() =>
                  toggleTask(task.id)
                }
              />

              <span
                style={{
                  marginLeft: "10px",
                  textDecoration:
                    task.completed
                      ? "line-through"
                      : "none"
                }}
              >
                <div>
  <div>{task.text}</div>

  {task.due_date && (
    <div
      style={{
        fontSize: "12px",
        color: textDim,
      }}
    >
       Due: {task.due_date}
    </div>
  )}
</div>
              </span>
            </div>

            <button
              onClick={() =>
                deleteTask(task.id)
              }
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "transparent",
                border: `1px solid ${red}`,
                color: red,
                padding: "8px 12px",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              <Trash2 size={13} strokeWidth={2} />
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  </div>
  );
}

const statCard = {
  background: card,
  padding: "24px",
  height: "110px",
  borderRadius: "var(--radius-lg)",
border: `1px solid ${border}`,
  minWidth: "180px"

};

const bigNumber = {
  fontSize: "36px",
  fontWeight: "bold" as const,
  marginTop: "6px"
};

const button = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  background: blue,
  border: "none",
  color: "white",
  padding: "12px 20px",
  borderRadius: "var(--radius-sm)",
  cursor: "pointer",
  fontWeight: 700,
};

const secondaryButton = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  background: "transparent",
  border: `1px solid ${border}`,
  color: text,
  padding: "12px 20px",
  borderRadius: "var(--radius-sm)",
  cursor: "pointer",
  fontWeight: 600,
};
