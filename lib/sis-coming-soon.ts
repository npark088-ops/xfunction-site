// COMING SOON — NOT YET IMPLEMENTED
// ---------------------------------------------------------------------
// These four are Student Information Systems (SIS) — the system of
// record for official grades/transcripts/enrollment, as distinct from
// an LMS (Canvas, Schoology, Google Classroom, Moodle, Blackboard —
// see lib/platforms.ts's "lms" category), which handles day-to-day
// assignments and coursework. Schools very commonly run one of each at
// once (e.g. PowerSchool for the gradebook of record + Canvas for
// actual assignments), which is why "Connect your platform" (see
// components/PlatformConnectionsCard.tsx) offers one dropdown per
// category instead of a single flat list.
//
// None of these four have a working "Connect" button — see
// comingSoonCopy per platform in lib/platforms.ts — because none of
// them offer a self-service way for an individual student (or even an
// individual developer) to get API access the way a Canvas Developer
// Key or a Google/Schoology/Blackboard OAuth app registration does.
// Every one of these requires the SCHOOL DISTRICT's own IT/admin staff
// to explicitly enable and configure access before any third-party app
// can reach a single student's data — that's a fundamentally different,
// slower-moving integration model than "click connect, log in, done,"
// so these are expected to stay placeholders for a long time rather
// than being a small gap that just hasn't been filled in yet.
export const SIS_COMING_SOON_STATUS = {
  available: false,
  reason: "requires_district_approval" as const,
};

// PowerSchool SIS
// Real access requires a district admin to install a signed "Data
// Provider Configuration" plugin package via the PowerSchool admin
// portal — there's no public self-service developer console to
// register an OAuth client at all. Once installed, the actual API auth
// is a two-legged OAuth2 client_credentials grant (HTTP Basic
// client_id:client_secret POSTed to {schoolDomain}/oauth/access_token)
// — the plugin authenticates as itself, trusted district-wide; there's
// no per-student consent redirect the way Canvas/Google/Schoology/
// Blackboard have.
export const POWERSCHOOL_NOTE =
  "PowerSchool API access has to be approved and installed by your school district's IT admin, not something we or you can turn on directly.";

// Infinite Campus SIS
// Real access requires the district to have purchased/enabled Infinite
// Campus's "Campus API" module and have district IT generate OAuth2
// client credentials specifically for the integration — again a
// district-controlled allowlist, not a public developer signup. Auth
// is OAuth2, but every credential is issued by hand by district staff.
export const INFINITE_CAMPUS_NOTE =
  "Infinite Campus API access requires your district's IT team to enable the Campus API module and issue credentials — there's no self-service way to request it.";

// Skyward SIS
// Real access requires the district to enable Skyward's API Gateway and
// issue integration-specific credentials through district-level admin
// tools (Qmlativ or Student Management Suite, depending on the
// district's Skyward product line) — same district-gatekeeper model as
// the others, no public developer portal.
export const SKYWARD_NOTE =
  "Skyward API access requires your district to enable their API Gateway and issue credentials for this integration — that's a district IT decision, not a student-facing setting.";

// StudentVUE / Synergy SIS (Edupoint)
// Meaningfully further behind the other three: StudentVUE is a
// read-only parent/student portal backed by an undocumented SOAP API,
// not a public REST/OAuth API at all. Real third-party access to the
// underlying Synergy SIS data goes through a formal data-sharing
// agreement directly with Edupoint/the district (e.g. their
// eSchoolPLUS/Synergy data exchange), not an app registration —
// there's no OAuth client to even ask for yet.
export const STUDENTVUE_SYNERGY_NOTE =
  "StudentVUE/Synergy has no public developer API yet — real access would mean a formal data-sharing agreement between us and your district, not something either of us can switch on.";
