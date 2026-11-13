import { promises as fs } from "fs";
import path from "path";

// events.json is runtime data (gitignored), so it does not exist in a
// fresh clone or a new deploy — a missing file just means "no events yet".
// Note: on Vercel the deployed filesystem is read-only, so POST can only
// persist events when this runs locally.
const filePath = path.join(process.cwd(), "events.json");

async function readEvents(): Promise<unknown[]> {
  try {
    const file = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(file);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

export async function GET() {
  return Response.json(await readEvents());
}

export async function POST(request: Request) {
  const data = await request.json();

  const events = await readEvents();
  events.push({
    ...data,
    time: new Date().toISOString(),
  });

  await fs.writeFile(filePath, JSON.stringify(events, null, 2));

  return new Response("ok");
}
