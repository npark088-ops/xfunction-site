import { redirect } from "next/navigation";

// Your Consultant moved from a dedicated page to a floating slide-out
// panel available on every dashboard page (see components/ConsultantPanel.tsx,
// mounted in app/(dashboard)/layout.tsx). Kept as a redirect so old
// bookmarks/links to /ask still land somewhere instead of 404ing.
export default function AskRedirect() {
  redirect("/today");
}
