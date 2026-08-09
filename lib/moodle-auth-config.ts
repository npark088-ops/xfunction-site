// REAL MOODLE-SHAPED CONFIG
// ---------------------------------------------------------------------
// Unlike Canvas/Google/Schoology/Blackboard, there's no single
// "moodle.com" host to point at — every school self-hosts its own
// Moodle instance at its own domain, so the site URL isn't a fixed env
// var here, it's entered per-connection by the student (see
// app/connect/moodle/page.tsx) and stored per-user in the
// moodle_connections table.
//
// The one thing that IS fixed per our app (not per school) is the
// "external service" shortname Moodle uses to scope what a token can
// do — set MOODLE_SERVICE_SHORTNAME if a school registers a custom
// service for XFunction; defaults to Moodle's built-in mobile app
// service, which most Moodle sites already have enabled and which is
// commonly reused by third-party integrations for exactly this reason.
export const moodleAuthConfig = {
  serviceShortName: process.env.MOODLE_SERVICE_SHORTNAME || "moodle_mobile_app",
};
