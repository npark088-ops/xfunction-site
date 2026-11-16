import {
  POWERSCHOOL_NOTE,
  INFINITE_CAMPUS_NOTE,
  SKYWARD_NOTE,
  STUDENTVUE_SYNERGY_NOTE,
} from "./sis-coming-soon";

// Registry of every platform XFunction can connect to. Drives the
// "Connect your platform" section (see
// components/PlatformConnectionsCard.tsx and
// app/(dashboard)/courses/page.tsx) — adding a new platform means adding
// one entry here plus its lib/{platform}-*.ts + app/api/{platform}/*
// files, not touching the card's rendering logic.
//
// Split into two categories reflecting a real, meaningful distinction
// in how schools actually run their systems:
//   - "lms" (Learning Management System) — day-to-day assignments,
//     coursework, and course-level gradebooks. Individually accessible:
//     a single developer can register an app/API key for any of these
//     without district involvement, which is why all five are
//     "available" here.
//   - "sis" (Student Information System) — the official system of
//     record for grades/transcripts/enrollment. Every one of these
//     requires district-level IT approval before any third party can
//     reach a single student's data (see lib/sis-coming-soon.ts for
//     why, per platform), so all four are "coming soon."
// A school commonly runs one of each (e.g. PowerSchool as the official
// gradebook + Canvas for actual assignments) — that's why the UI offers
// one dropdown per category rather than a single flat list.
export type PlatformCategory = "lms" | "sis";

export type PlatformId =
  | "canvas"
  | "google-classroom"
  | "schoology"
  | "moodle"
  | "blackboard"
  | "powerschool"
  | "infinite-campus"
  | "skyward"
  | "studentvue-synergy";

// A student's signup-time answer to "what platform does your school
// use?" (see app/login/page.tsx's optional signup fields and
// profiles.platform_preference in supabase/migrations/0023_signup_profile_fields.sql).
// "other" and "not-sure" aren't PlatformIds — the "Connect your
// platform" section (components/PlatformConnectionsCard.tsx) just skips
// pre-selection and shows a short contextual note instead.
export type PlatformPreference = PlatformId | "other" | "not-sure" | null;

export interface PlatformConfig {
  id: PlatformId;
  category: PlatformCategory;
  name: string;
  notConnectedCopy: string;
  connectedCopy: string;
  connectHref: string | null;
  statusHref: string | null;
  disconnectHref: string | null;
  comingSoon?: boolean;
  comingSoonCopy?: string;
}

const DEMO_SYNC_COPY =
  "The course data shown below is still sample data — this connection doesn't sync real grades yet.";

export const LMS_PLATFORMS: PlatformConfig[] = [
  {
    id: "canvas",
    category: "lms",
    name: "Canvas",
    notConnectedCopy:
      "Connect your Canvas account to keep grades in sync. (Using the local mock Canvas stand-in — no real credentials needed yet.)",
    connectedCopy: DEMO_SYNC_COPY,
    connectHref: "/api/canvas/connect",
    statusHref: "/api/canvas/status",
    disconnectHref: "/api/canvas/disconnect",
  },
  {
    id: "google-classroom",
    category: "lms",
    name: "Google Classroom",
    notConnectedCopy:
      "Connect your Google Classroom account to keep grades in sync. (Using the local mock Google stand-in — no real credentials needed yet.)",
    connectedCopy: DEMO_SYNC_COPY,
    connectHref: "/api/google-classroom/connect",
    statusHref: "/api/google-classroom/status",
    disconnectHref: "/api/google-classroom/disconnect",
  },
  {
    id: "schoology",
    category: "lms",
    name: "Schoology",
    notConnectedCopy:
      "Connect your Schoology account to keep grades in sync. (Using the local mock Schoology stand-in — no real credentials needed yet.)",
    connectedCopy: DEMO_SYNC_COPY,
    connectHref: "/api/schoology/connect",
    statusHref: "/api/schoology/status",
    disconnectHref: "/api/schoology/disconnect",
  },
  {
    id: "moodle",
    category: "lms",
    name: "Moodle",
    notConnectedCopy:
      "Connect your Moodle account to keep grades in sync. Moodle logs you in directly (no redirect to a separate consent screen) — using the local mock Moodle stand-in for now, no real credentials needed yet.",
    connectedCopy: DEMO_SYNC_COPY,
    connectHref: "/connect/moodle",
    statusHref: "/api/moodle/status",
    disconnectHref: "/api/moodle/disconnect",
  },
  {
    id: "blackboard",
    category: "lms",
    name: "Blackboard",
    notConnectedCopy:
      "Connect your Blackboard account to keep grades in sync. (Using the local mock Blackboard stand-in — no real credentials needed yet.)",
    connectedCopy: DEMO_SYNC_COPY,
    connectHref: "/api/blackboard/connect",
    statusHref: "/api/blackboard/status",
    disconnectHref: "/api/blackboard/disconnect",
  },
];

export const SIS_PLATFORMS: PlatformConfig[] = [
  {
    id: "powerschool",
    category: "sis",
    name: "PowerSchool",
    notConnectedCopy: "",
    connectedCopy: "",
    connectHref: null,
    statusHref: null,
    disconnectHref: null,
    comingSoon: true,
    comingSoonCopy: `Coming soon — requires district approval. ${POWERSCHOOL_NOTE}`,
  },
  {
    id: "infinite-campus",
    category: "sis",
    name: "Infinite Campus",
    notConnectedCopy: "",
    connectedCopy: "",
    connectHref: null,
    statusHref: null,
    disconnectHref: null,
    comingSoon: true,
    comingSoonCopy: `Coming soon — requires district approval. ${INFINITE_CAMPUS_NOTE}`,
  },
  {
    id: "skyward",
    category: "sis",
    name: "Skyward",
    notConnectedCopy: "",
    connectedCopy: "",
    connectHref: null,
    statusHref: null,
    disconnectHref: null,
    comingSoon: true,
    comingSoonCopy: `Coming soon — requires district approval. ${SKYWARD_NOTE}`,
  },
  {
    id: "studentvue-synergy",
    category: "sis",
    name: "StudentVUE / Synergy",
    notConnectedCopy: "",
    connectedCopy: "",
    connectHref: null,
    statusHref: null,
    disconnectHref: null,
    comingSoon: true,
    comingSoonCopy: `Coming soon — requires district approval. ${STUDENTVUE_SYNERGY_NOTE}`,
  },
];

export const PLATFORMS: PlatformConfig[] = [...LMS_PLATFORMS, ...SIS_PLATFORMS];
