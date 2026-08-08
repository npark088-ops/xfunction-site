import { getCachedUser, createClient } from "../../../lib/supabase/server";
import { SearchResults } from "../../../components/SearchResults";
import { DemoDataBadge } from "../../../components/DemoDataBadge";

const text = "var(--text)";
const textDim = "var(--text-dim)";

// Server component — fetches this student's notes once up front (RLS
// already scopes course_notes to auth.uid(), so no course filter is
// needed) and hands them to the client component alongside the static
// mock assignment data, same seed-then-hydrate pattern used elsewhere
// (Settings' parent links, Courses' Canvas status).
export default async function SearchPage() {
  const user = await getCachedUser();
  let initialNotes: { course_id: string; content: string }[] = [];

  if (user) {
    const supabase = await createClient();
    const { data } = await supabase.from("course_notes").select("course_id, content");
    initialNotes = data ?? [];
  }

  return (
    <div
      className="xf-page-enter"
      style={{
        minHeight: "100vh",
        color: text,
        fontFamily: "Inter, sans-serif",
        padding: "48px 40px",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div
          style={{
            marginBottom: 8,
            color: textDim,
            fontSize: 13,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          XFunction · Search
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 4 }}>
          <h1 style={{ fontSize: 34, fontWeight: 700, margin: 0, letterSpacing: "-0.02em", color: text }}>
            Search
          </h1>
          <DemoDataBadge />
        </div>
        <p style={{ color: textDim, marginBottom: 28, fontSize: 15 }}>
          Find an assignment or something you wrote down, across every course. Assignment results are
          sample data — your notes are real.
        </p>

        <SearchResults initialNotes={initialNotes} />
      </div>
    </div>
  );
}
