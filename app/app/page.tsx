import { redirect } from "next/navigation";

// /app used to be the whole signed-in app (courses, grades, coach
// check-in, everything) before it got split into a proper sidebar +
// /overview, /courses, /tasks, /settings layout. Kept as a redirect so
// old bookmarks/links still land somewhere — now at the same default
// landing page as a fresh login (/today).
export default function AppRedirect() {
  redirect("/today");
}
