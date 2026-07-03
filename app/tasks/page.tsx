"use client";

import { useEffect, useState } from "react";

type Task = {
  text: string;
  completed: boolean;
  dueDate: string;
};

export default function TasksPage() {
  const [task, setTask] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [steps, setSteps] = useState<string[]>([]);

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
    dueDate
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

  const breakDownTask = () => {
    if (!task.trim()) return;

    setSteps([
      `Research "${task}"`,
      `Create a plan for "${task}"`,
      `Complete the first section`,
      `Complete the second section`,
      `Review your work`,
      `Finish and submit`
    ]);
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
        background: "#111827",
        color: "white",
        minHeight: "100vh",
        padding: "40px",
        fontFamily: "Arial"
      }}
    >
      <h1
        style={{
          fontSize: "42px",
          marginBottom: "10px"
        }}
      >
        🧠 xFunction Tasks
      </h1>

      <p
        style={{
          opacity: 0.8,
          marginBottom: "30px"
        }}
      >
        Turn overwhelming tasks into manageable steps.
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
          background: "#1e293b",
          padding: "20px",
          borderRadius: "12px",
          marginBottom: "30px"
        }}
      >
        <h2>➕ Add Task</h2>

        <input
          value={task}
          onChange={(e) =>
            setTask(e.target.value)
          }
          placeholder="Enter a task..."
          style={{
            width: "100%",
            padding: "12px",
            marginTop: "10px",
            marginBottom: "15px",
            borderRadius: "8px",
            border: "none"
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
    padding: "12px",
    marginBottom: "15px",
    borderRadius: "8px",
    border: "none"
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
      </div>

      {steps.length > 0 && (
        <div
          style={{
            background: "#1e293b",
            padding: "20px",
            borderRadius: "12px",
            marginBottom: "30px"
          }}
        >
          <h2>🤖 AI Breakdown</h2>

          {steps.map((step, index) => (
            <div
              key={index}
              style={{
                background: "#334155",
                padding: "12px",
                borderRadius: "8px",
                marginBottom: "10px"
              }}
            >
              ✅ {step}
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          background: "#1e293b",
          padding: "20px",
          borderRadius: "12px"
        }}
      >
        <h2>📋 My Tasks</h2>

        {tasks.length === 0 && (
          <p>No tasks yet.</p>
        )}

        {tasks.map((task, index) => (
          <div
            key={index}
            style={{
              background: "#334155",
              padding: "12px",
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
      📅 Due: {task.dueDate}
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
  );
}

const card = {
  background: "#1e293b",
  padding: "20px",
  borderRadius: "12px",
  minWidth: "180px"
};

const bigNumber = {
  fontSize: "32px",
  fontWeight: "bold" as const,
  marginTop: "10px"
};

const button = {
  background: "#38bdf8",
  border: "none",
  color: "white",
  padding: "10px 18px",
  borderRadius: "8px",
  cursor: "pointer"
};