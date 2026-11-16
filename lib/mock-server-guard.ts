// The fake school-platform servers (a pretend Canvas, Google, Schoology,
// Moodle and Blackboard, used to try the connect flows without a real school
// account) must only exist while developing. In production every one of those
// routes answers 404, as if the page were not there.
//
// Each mock route starts with:
//   const blocked = blockMockServerInProduction();
//   if (blocked) return blocked;
export function mockServersEnabled(): boolean {
  return process.env.NODE_ENV !== "production";
}

export function blockMockServerInProduction(): Response | null {
  return mockServersEnabled() ? null : new Response("Not found", { status: 404 });
}
