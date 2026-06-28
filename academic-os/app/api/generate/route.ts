export async function POST(req: Request) {
  const { assignments } = await req.json();

  if (assignments.length === 0) {
    return Response.json({
      plan: "Add assignments to generate a study plan.",
    });
  }

  // Sort by due date
  const sorted = assignments.sort(
    (a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  let plan = "Your Weekly Study Plan:\n\n";

  sorted.forEach((a: any, index: number) => {
    const day = days[index % 7];

    plan += `${day}:\n`;
    plan += `• Work on "${a.title}"\n`;
    plan += `• Due: ${a.dueDate}\n`;
    plan += `• Suggested time: 1–2 hours\n\n`;
  });

  return Response.json({ plan });
}