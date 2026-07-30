"use client";

export default function HomePage() {
  return (
    <div
      style={{
        background: "#020617",
        minHeight: "100vh",
        color: "white",
        padding: "40px",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
        }}
      >
        <h1
          style={{
            fontSize: "52px",
            marginBottom: "10px",
          }}
        >
          xFunction
        </h1>

        <p
          style={{
            opacity: 0.6,
            marginBottom: "40px",
          }}
        >
          Plan less. Execute more.
        </p>

        <div style={card}>
  <h2>Today's Focus</h2>
  <p>History Essay</p>
  <p>Create outline</p>
</div>

<div
  style={{
    ...card,
    cursor: "pointer",
  }}
  onClick={() => {
    window.location.href = "/tasks";
  }}
>

<div
  style={{
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "20px",
  }}
>

  <h2>Biology</h2>
  <p>3 Tasks</p>
</div>

<div style={card}>
  <h2>History</h2>
  <p>2 Tasks</p>
</div>

          <div style={card}>
            <h2>English</h2>
            <p>4 Tasks</p>
          </div>

          <div style={card}>
            <h2>Math</h2>
            <p>1 Task</p>
          </div>

          <div style={card}>
            <h2>Upcoming</h2>
            <p>Biology Quiz</p>
            <p>Tomorrow</p>
          </div>

          <div style={card}>
            <h2>Progress</h2>
            <p
              style={{
                fontSize: "48px",
                fontWeight: 700,
              }}
            >
              72%
            </p>
          </div>

          <div style={card}>
            <h2>AI Coach</h2>
            <p>Get recommendation</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const card = {
  background: "#111827",
  border: "1px solid #1f2937",
  borderRadius: "18px",
  minHeight: "250px",
  padding: "24px",
  boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
};