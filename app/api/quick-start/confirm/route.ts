import { createClient } from "../../../../lib/supabase/server";
import { createAssignment, createCourse, createGroup } from "../../../../lib/user-courses";
import { getRequestTimeZone } from "../../../../lib/request-tz";
import { localDate } from "../../../../lib/local-date";
import { inputValueToDueAt } from "../../../../lib/due-dates";
import { QS_LIMITS, normalizeQuickStart } from "../../../../lib/quick-start";

// Quick Start, step 2: the student tapped Confirm. Saves what they reviewed.
//
// The AI is not involved here. The courses in the request are checked again,
// STRICTLY (lib/quick-start.ts): the browser's copy is as untrusted as anything
// else, so nothing is saved unless every name, weight, date and point value is
// valid and the caps hold. Rows are created with the same helpers the
// Courses page uses (lib/user-courses.ts), as the signed-in student, so row-level
// security applies as usual.
//
// If any step fails part-way, everything THIS call created is removed again (a
// course's groups and assignments go with it via ON DELETE CASCADE), the same
// way "Load demo data" cleans up, so the student is never left with half an import.
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const raw = await req.text();
  if (raw.length > 400_000) {
    return Response.json({ error: "too_long", message: "That's too much to save at once." }, { status: 413 });
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "bad_request", message: "Something went wrong sending that. Please try again." }, { status: 400 });
  }

  const today = localDate(await getRequestTimeZone());
  const checked = normalizeQuickStart(body, { today, mode: "strict" });
  if (!checked.ok) {
    return Response.json({ error: "invalid", message: checked.message }, { status: 400 });
  }
  const { courses } = checked.preview;

  // A student can't build up unlimited courses through repeated imports.
  const { count, error: countError } = await supabase
    .from("courses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if (countError) {
    console.error("Quick Start confirm: counting courses failed:", countError.message);
    return Response.json({ error: "failed", message: "Couldn't save your classes. Nothing was changed. Please try again." }, { status: 500 });
  }
  if ((count ?? 0) + courses.length > QS_LIMITS.maxCoursesPerAccount) {
    return Response.json(
      { error: "too_many", message: `You can have up to ${QS_LIMITS.maxCoursesPerAccount} classes. Delete some on the Courses page first.` },
      { status: 400 }
    );
  }

  const createdCourseIds: string[] = [];
  let assignmentCount = 0;
  try {
    for (const course of courses) {
      const courseId = await createCourse(supabase, user.id, {
        name: course.name,
        creditHours: 1,
        gradingScale: "standard",
      });
      createdCourseIds.push(courseId);

      const groupIdByCategory = new Map<string, number>();
      for (let i = 0; i < course.categories.length; i++) {
        const category = course.categories[i];
        const groupId = await createGroup(supabase, user.id, courseId, {
          name: category.name,
          weight: category.weight,
          position: i,
        });
        groupIdByCategory.set(category.name, groupId);
      }

      for (const assignment of course.assignments) {
        const groupId = groupIdByCategory.get(assignment.category);
        if (groupId === undefined) throw new Error("Assignment category missing");
        await createAssignment(supabase, user.id, groupId, {
          name: assignment.title,
          pointsPossible: assignment.points,
          // Date-only due dates: see lib/due-dates.ts.
          dueAt: assignment.dueDate ? inputValueToDueAt(assignment.dueDate) : null,
          score: null,
        });
        assignmentCount++;
      }
    }
  } catch (error) {
    console.error("Quick Start confirm failed:", error instanceof Error ? error.message : "unknown");
    if (createdCourseIds.length > 0) {
      const { error: cleanupError } = await supabase
        .from("courses")
        .delete()
        .eq("user_id", user.id)
        .in("id", createdCourseIds);
      if (cleanupError) console.error("Quick Start cleanup failed:", cleanupError.message);
    }
    return Response.json(
      { error: "failed", message: "Couldn't save your classes. Nothing was changed. Please try again." },
      { status: 500 }
    );
  }

  return Response.json({ ok: true, courses: courses.length, assignments: assignmentCount });
}
