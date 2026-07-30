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

const trends: Record<string, number> = {};

filtered.forEach(e => {
  const hour = new Date(e.time).getHours();

  trends[hour] = (trends[hour] || 0) + 1;
});

const totalUsers = Object.keys(userCounts).length;

const topEvent =
  Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "None";

const latestEvent =
  filtered[0]?.event || "None";

const lastUpdated =
  filtered[0]?.time
    ? new Date(filtered[0].time).toLocaleString()
    : "No data";

<div style={card}>
  <div>⏰ Last Updated</div>
  <div>{lastUpdated}</div>
</div>

const trendData = {
  labels: Object.keys(trends),
  datasets: [
    {
      label: "Events by Hour",
      data: Object.values(trends),
      backgroundColor: "#22c55e"
    }
  ]
};

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
  <div
    style={{
      minHeight: "100vh",
      color: "white",
      background: "#111",
      padding: "30px"
    }}
  >

    
      <h1
  style={{
    fontSize: "42px",
    marginBottom: "20px"
  }}
>
  🚀 xFunction Analytics
</h1>
<div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(4, 220px)",
    gap: "15px",
    marginBottom: "20px"
  }}
>
  <div style={card}>
    <div>📈 Total Events</div>
    <div>{filtered.length}</div>
  </div>

  <div style={card}>
    <div>👥 Total Users</div>
    <div>{totalUsers}</div>
  </div>

  <div style={card}>
    <div>🔥 Top Event</div>
    <div>{topEvent}</div>
  </div>

  <div style={card}>
    <div>⏰ Latest Event</div>
    <div>{latestEvent}</div>
  </div>
</div>
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
        <div style={{ width: "500px", height: "250px" }}>
  <Bar data={chartData} />
</div>
      </div>


      <div
        style={{
  marginBottom: "30px",
  background: "#1e293b",
  padding: "20px",
  borderRadius: "10px",
  maxWidth: "100%",
  overflow: "hidden"
}}
      >
        <div style={{ width: "300px", height: "300px" }}>
  <Pie data={chartData} />
</div>
``
      </div>

<div
  style={{
  marginBottom: "30px",
  background: "#1e293b",
  padding: "20px",
  borderRadius: "10px",
  maxWidth: "100%",
  overflow: "hidden"
}}
>
  <h2>📈 Activity Trend</h2>
  <Bar data={trendData} />
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

<div style={{ marginBottom: "30px" }}>
  <h2>🔴 Live Activity</h2>

  {filtered.slice(0, 20).map((e, i) => (
    <div
      key={i}
      style={{
        background: "#1e293b",
        padding: "10px",
        borderRadius: "8px",
        marginBottom: "5px"
      }}
    >
      <strong>{e.event}</strong>
      {" • "}
      {e.user}
      {" • "}
      {new Date(e.time).toLocaleTimeString()}
    </div>
  ))}
</div>

      <div
  style={{
    display: "flex",
    gap: "15px",
    marginBottom: "20px",
    flexWrap: "nowrap"
  }}
>
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


      <div style={{ overflowX: "auto" }}>
  <table style={{ width: "100%" }}>
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
    </div>
  );
}


const cell = {
  padding: "10px"
};

const card = {
  background: "#1e293b",
  padding: "12px",
  borderRadius: "10px",
  width: "220px",
  height: "90px"
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


