"use client";


import { useEffect, useState } from "react";
import { Bar, Pie } from "react-chartjs-2";

ChartJS.register(BarElement, CategoryScale, LinearScale, ArcElement);


export default function Dashboard() {
  const [events, setEvents] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");

  // ✅ ADD USER ID CREATION (runs once per user)
  useEffect(() => {
    if (!localStorage.getItem("user_id")) {
      const id = Math.random().toString(36).substring(2);
      localStorage.setItem("user_id", id);
    }
  }, []);


  const counts: Record<string, number> = {};

  // ✅ FIRST define filtered
  const filtered = events.filter(e => {
    if (filter === "all") return true;
    if (filter === "click") return e.event.includes("click");
    if (filter === "cookie") return e.event.includes("cookie");
  });

  // ✅ THEN userCounts (USES filtered)
  const userCounts: Record<string, number> = {};
  filtered.forEach(e => {
    const user = e.user || "unknown";
    userCounts[user] = (userCounts[user] || 0) + 1;
  });

const userPaths: Record<string, string[]> = {};

filtered.forEach(e => {
  const user = e.user || "unknown";

  if (!userPaths[user]) {
    userPaths[user] = [];
  }

  userPaths[user].push(e.event);
});
``

  // ✅ THEN counts (USES filtered)
  filtered.forEach(e => {
    counts[e.event] = (counts[e.event] || 0) + 1;
  });

  const chartData = {
    labels: Object.keys(counts),
    datasets: [
      {
        label: "Event Count",
        data: Object.values(counts),
        backgroundColor: "#38bdf8"
      }
    ]
  };


  // ✅ LOAD DATA (auto updates)
  useEffect(() => {
    const load = () => {
      fetch("/api/events")
        .then(res => res.json())
        .then(data => setEvents(data.reverse()));
    };

    load();
    const interval = setInterval(load, 2000);

    return () => clearInterval(interval);
  }, []);


  return (
    <div style={{ padding: "40px", color: "white", background: "#111" }}>
      <h1>📊 Dashboard</h1>

      <p style={{ marginBottom: "10px", opacity: 0.7, fontSize: "14px" }}>
        Total Events: {filtered.length}
      </p>

      <div style={{ marginBottom: "15px" }}>
        <button
          onClick={() => setFilter("all")}
          style={{ ...btn, background: filter === "all" ? "#38bdf8" : "#333" }}
        >
          All
        </button>

        <button
          onClick={() => setFilter("click")}
          style={{ ...btn, background: filter === "click" ? "#38bdf8" : "#333" }}
        >
          Clicks
        </button>

        <button
          onClick={() => setFilter("cookie")}
          style={{ ...btn, background: filter === "cookie" ? "#38bdf8" : "#333" }}
        >
          Cookies
        </button>
      </div>


      <div
        style={{
          marginBottom: "30px",
          background: "#1e293b",
          padding: "20px",
          borderRadius: "10px"
        }}
      >
        <Bar data={chartData} />
      </div>


      <div
        style={{
          marginBottom: "30px",
          background: "#1e293b",
          padding: "20px",
          borderRadius: "10px"
        }}
      >
        <Pie data={chartData} />
      </div>


      <div style={{ marginBottom: "30px" }}>
        <h2>👤 User Activity</h2>

<div style={{ marginTop: "20px" }}>
  <h3>🧭 User Journeys</h3>

  {Object.entries(userPaths).map(([user, events]) => (
    <div
      key={user}
      style={{
        background: "#111",
        padding: "10px",
        borderRadius: "8px",
        marginBottom: "10px"
      }}
    >
      <strong>{user}</strong>
      <div>
        {events.join(" → ")}
      </div>
    </div>
  ))}
</div>

        {Object.entries(userCounts).map(([user, count]) => (
          <div
            key={user}
            style={{
              background: "#1e293b",
              padding: "10px",
              borderRadius: "8px",
              marginBottom: "5px"
            }}
          >
            {user}: {count} actions
          </div>
        ))}
      </div>


      <div style={{ display: "flex", gap: "15px", marginBottom: "20px" }}>
        {Object.entries(counts).map(([event, count]) => (
          <div
            key={event}
            style={{
              background: "#222",
              padding: "10px",
              borderRadius: "8px"
            }}
          >
            <div>{event}</div>
            <div style={{ fontSize: "20px" }}>{count}</div>
          </div>
        ))}
      </div>


      <table>
        <thead>
          <tr>
            <th style={cell}>Event</th>
            <th style={cell}>User</th>
            <th style={cell}>Time</th>
          </tr>
        </thead>

        <tbody>
          {filtered.map((e, i) => (
            <tr
              key={i}
              style={{
                transition: "0.2s",
                cursor: "pointer"
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#222")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <td style={cell}>{e.event}</td>
              <td style={cell}>{e.user}</td>
              <td style={cell}>
                {new Date(e.time).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


const cell = {
  padding: "10px"
};


const btn = {
  marginRight: "10px",
  padding: "8px 12px",
  borderRadius: "6px",
  border: "none",
  cursor: "pointer",
  color: "white"
};


import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
} from "chart.js";
