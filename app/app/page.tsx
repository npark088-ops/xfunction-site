import { redirect } from "next/navigation";

// /app used to be the whole signed-in app (courses, grades, coach
// check-in, everything) before it got split into a proper sidebar +
// /overview, /courses, /tasks, /settings layout. Kept as a redirect so
// old bookmarks/links still land somewhere.
export default function AppRedirect() {
  redirect("/overview");
}
