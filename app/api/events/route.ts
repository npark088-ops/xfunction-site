import { promises as fs } from "fs";
import path from "path";

export async function GET() {
  const filePath = path.join(process.cwd(), "events.json");

  const file = await fs.readFile(filePath, "utf-8");
  const events = JSON.parse(file);

  return Response.json(events);
}

export async function POST(request: Request) {
  const data = await request.json();

  const filePath = path.join(process.cwd(), "events.json");

  const file = await fs.readFile(filePath, "utf-8");
  const events = JSON.parse(file);

  events.push({
  ...data,
  user: data.user || "anonymous",
  time: new Date().toISOString(),
});

  await fs.writeFile(filePath, JSON.stringify(events, null, 2));

  return new Response("ok");
}