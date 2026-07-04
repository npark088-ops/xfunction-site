"use client";

import { useEffect, useState } from "react";

type Task = {
  text: string;
  completed: boolean;
  dueDate: string;
  aiResponse?: string;
};

export default function TasksPage() {
  const [task, setTask] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [steps, setSteps] = useState<string[]>([]);
const [coachAdvice, setCoachAdvice] = useState("");


  useEffect(() => {
    const savedTasks = localStorage.getItem("xfunction_tasks");

    if (savedTasks) {
      setTasks(JSON.parse(savedTasks));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("xfunction_tasks", JSON.stringify(tasks));
  }, [tasks]);

  const addTask = () => {
    if (!task.trim()) return;

setTasks([
  ...tasks,
  {
    text: task,
    completed: false,
    dueDate,
    aiResponse: ""
  }
]);

    setDueDate("");
  };

  const deleteTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const toggleTask = (index: number) => {
    setTasks(
      tasks.map((task, i) =>
        i === index
          ? { ...task, completed: !task.completed }
          : task
      )
    );
  };

  const breakDownTask = async () => {
  if (!task.trim()) return;


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
  }
};

const getCoachAdvice = async () => {
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
      `${t.text} | Due: ${t.dueDate} | Completed: ${t.completed}`
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
    style={{
      background: "#020617",
      color: "white",
      minHeight: "100vh",
      padding: "40px",
      fontFamily: "Inter, sans-serif"
     }}
  >
  <div
  style={{
    maxWidth: "1200px",
    margin: "0 auto"
  }}
>
   <h1
  style={{
    fontSize: "56px",
    fontWeight: 700,
    lineHeight: 0.9,
    letterSpacing: "-2px",
    marginBottom: "0px"
  }}
>
  xFunction
</h1>

<p
  style={{
    fontSize: "16px",
    opacity: 0.55,
    fontWeight: 500,
    marginTop: "10px",
    marginBottom: "40px",
    letterSpacing: "0.5px"
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
        <div style={card}>
          <div>Total Tasks</div>
          <div style={bigNumber}>{tasks.length}</div>
        </div>

        <div style={card}>
          <div>Completed</div>
          <div style={bigNumber}>
            {completedTasks}
          </div>
        </div>

        <div style={card}>
          <div>Completion Rate</div>
          <div style={bigNumber}>
            {completionRate}%
          </div>
        </div>
      </div>

      <div
        style={{
          background: "#111827",
          padding: "20px",
          borderRadius: "12px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
border: "1px solid #1f2937",
          marginBottom: "30px"
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
            padding: "18px",
            transition: "0.2s ease",
            marginTop: "10px",
            marginBottom: "15px",
            borderRadius: "8px",
           border: "1px solid #374151",
background: "#0f172a",
color: "white",
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
    padding: "18px",
    transition: "0.2s ease",
    marginBottom: "15px",
    borderRadius: "8px",
    border: "1px solid #374151",
background: "#0f172a",
color: "white",
  }}
/>
<button
  onClick={addTask}
  style={button}
>
  Save Task
</button>

<button
  onClick={breakDownTask}
  style={{
    ...button,
    marginLeft: "10px"
  }}
>
  Break Down With AI
</button>

<button
  onClick={getCoachAdvice}
  style={{
    ...button,
    marginLeft: "10px"
  }}
>
  Get AI Recommendation
</button>
      </div>

      {steps.length > 0 && (
        <div
          style={{
            background: "#111827",
            padding: "28px",
            borderRadius: "12px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
border: "1px solid #1f2937",
            marginBottom: "30px"
          }}
        >
          <h2>AI Breakdown</h2>

          {steps.map((step, index) => (
            <div
              key={index}
              style={{
               background: "#0f172a",
border: "1px solid #334155",
                padding: "18px",
                transition: "0.2s ease",
                borderRadius: "8px",
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
    style={{
     background: "#111827",
      padding: "28px",
      borderRadius: "12px",
      marginBottom: "20px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
      border: "1px solid #1f2937"
    }}
  >
    <h2>AI Coach</h2>

    <div
      style={{
        whiteSpace: "pre-wrap",
        lineHeight: 1.8
      }}
    >
      {coachAdvice}
    </div>
  </div>
)}
<div
  style={{
 background: "#111827",
    padding: "28px",
    borderRadius: "12px"
  }}
>
  <h2>My Tasks</h2>

        {tasks.length === 0 && (
          <p>No tasks yet.</p>
        )}

        {tasks.map((task, index) => (
          <div
            key={index}
            style={{
             background: "#0f172a",
border: "1px solid #334155",
              padding: "18px",
              transition: "0.2s ease",
              borderRadius: "8px",
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
                  toggleTask(index)
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

  {task.dueDate && (
    <div
      style={{
        fontSize: "12px",
        opacity: 0.7
      }}
    >
       Due: {task.dueDate}
    </div>
  )}
</div>
              </span>
            </div>

            <button
              onClick={() =>
                deleteTask(index)
              }
              style={{
                background: "#ef4444",
                border: "none",
                color: "white",
                padding: "8px 12px",
                borderRadius: "6px",
                cursor: "pointer"
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  </div>
  );
}

const card = {
  background: "#111827",
  padding: "24px",
  height: "120px",
  borderRadius: "16px",
  boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
border: "1px solid #1f2937",
  minWidth: "180px"
  
};

const bigNumber = {
  fontSize: "42px",
  fontWeight: "bold" as const,
  marginTop: "10px"
};

const button = {
  background: "#2563eb",
  border: "1px solid #3b82f6",
  color: "white",
  padding: "12px 20px",
  borderRadius: "12px",
  cursor: "pointer",
  fontWeight: 600,
  boxShadow:
    "0 4px 14px rgba(37,99,235,0.35)"
};

