import { NextRequest } from "next/server";
import { BlackboardUser } from "../../../../../../../lib/blackboard-types";

// FAKE STAND-IN ONLY
// ---------------------------------------------------------------------
// Lives at /learn/api/public/v1/users/{userId} — the exact path a real
// Blackboard Learn instance serves a user's profile at, used once right
// after the token exchange (see lib/blackboard-oauth.ts's getUser()) to
// find out the authorizing user's actual name, since Blackboard's token
// response (unlike Canvas's) only includes a user_id, not a display name.
export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const authHeader = request.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response("Missing bearer token", { status: 401 });
  }

  const { userId } = await params;

  const user: BlackboardUser = {
    id: userId,
    userName: "demo.student",
    name: { given: "Demo", family: "Student (Mock Blackboard)" },
  };
  return Response.json(user);
}
