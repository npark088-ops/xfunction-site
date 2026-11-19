import Link from "next/link";
import { QuickStart } from "../../../components/QuickStart";

// Quick Start: paste a syllabus or a list of classes and get real courses and
// assignments to review. Behind sign-in like the rest of the app (/start is in
// proxy.ts's protected list). Optional and skippable.
export default async function StartPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const { welcome } = await searchParams;

  return (
    <div
      className="xf-page-enter xf-dashboard-page"
      style={{ minHeight: "100vh", color: "var(--text)", padding: "48px 40px" }}
    >
      <div className="dash">
        <header className="dash__head">
          <div>
            <h1 className="dash__title">Quick Start</h1>
            <p className="dash__sub">Get your classes in without typing them all.</p>
          </div>
          <Link href="/today" className="xf-link">
            Skip for now
          </Link>
        </header>

        <QuickStart welcome={welcome === "1"} />
      </div>
    </div>
  );
}
