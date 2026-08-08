import { mockCourses } from "./mock-canvas-data";

// SIMULATED DATA — NOT REAL CANVAS CONTENT
// ---------------------------------------------------------------------
// Canvas's real API exposes a discussion_topics/announcements feed per
// course; this app's mock Canvas integration doesn't have one wired up
// yet, so these are hand-authored placeholders standing in for what
// that feed will show once real Canvas sync lands. postedAt is anchored
// to "now" (same trick as the upcoming assignment due dates in
// mock-canvas-data.ts) so these don't silently drift into the past as
// real time passes.

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

export interface Announcement {
  id: number;
  courseId: string;
  courseName: string;
  author: string;
  title: string;
  body: string;
  postedAt: string;
}

type MockAnnouncement = Omit<Announcement, "courseId" | "courseName">;

const MOCK_ANNOUNCEMENTS: Record<string, MockAnnouncement[]> = {
  "ap-biology": [
    {
      id: 1,
      author: "Ms. Reyes",
      title: "Unit 2 Test moved to Friday",
      body: "We're pushing the genetics test back two days to give everyone more time after the lab. Same format as Unit 1.",
      postedAt: hoursAgo(6),
    },
    {
      id: 2,
      author: "Ms. Reyes",
      title: "Extra credit: submit your Punnett square worksheet early",
      body: "Turn in the worksheet by Wednesday instead of Friday for 2 points of extra credit on the next quiz.",
      postedAt: hoursAgo(30),
    },
    {
      id: 3,
      author: "Ms. Reyes",
      title: "Office hours this week",
      body: "I'll be in room 214 Tuesday and Thursday from 3:00-3:45pm if you want to go over the Cell Structure worksheet.",
      postedAt: hoursAgo(72),
    },
  ],
  "us-history": [
    {
      id: 1,
      author: "Mr. Alvarez",
      title: "DBQ rubric posted",
      body: "The grading rubric for the Industrial Revolution DBQ is now up in Files. Check it before you finalize your thesis.",
      postedAt: hoursAgo(14),
    },
    {
      id: 2,
      author: "Mr. Alvarez",
      title: "Reminder: Quiz 2 covers Chapters 9-11 only",
      body: "A few people asked — the Civil War quiz does not include the Reconstruction chapter. That's next week.",
      postedAt: hoursAgo(50),
    },
  ],
  "algebra-2": [
    {
      id: 1,
      author: "Mr. Choi",
      title: "Logarithms unit test — calculators allowed",
      body: "You'll be able to use a graphing calculator on Thursday's test, but show your work for full credit on log properties.",
      postedAt: hoursAgo(10),
    },
    {
      id: 2,
      author: "Mr. Choi",
      title: "Corrected answer key for Section 4.3",
      body: "There was a typo on problem 12 in the answer key — the correct answer is x = 7, not x = 5. Updated file is posted.",
      postedAt: hoursAgo(40),
    },
    {
      id: 3,
      author: "Mr. Choi",
      title: "Tutoring available in the library",
      body: "Peer tutoring for Algebra II runs Mondays and Wednesdays at lunch in the library if you want extra help before the test.",
      postedAt: hoursAgo(95),
    },
  ],
};

export function getAllAnnouncements(): Announcement[] {
  return Object.entries(MOCK_ANNOUNCEMENTS)
    .flatMap(([courseId, items]) =>
      items.map((item) => ({
        ...item,
        courseId,
        courseName: mockCourses[courseId]?.name ?? courseId,
      }))
    )
    .sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
}

export function getCourseAnnouncements(courseId: string): Announcement[] {
  return getAllAnnouncements().filter((a) => a.courseId === courseId);
}
