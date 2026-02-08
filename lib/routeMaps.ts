export const boardSlugToRoute: Record<string, string> = {
  lecture: "lectures", // lecture만 예외(복수형)
  contribution: "contribution",
  seminar: "seminar",
  "expert-opinion-report": "expert-opinion-report",
  "shortform-contest": "shortform-contest",
  "essay-contest": "essay-contest",
  "midterm-report": "midterm-report",
  "misc-reports": "misc-reports",
  workshop: "workshop",
  "heartbeat-of-atoms": "heartbeat-of-atoms",
  atm: "atm",
};

export const routeToBoardSlug: Record<string, string> = Object.fromEntries(
  Object.entries(boardSlugToRoute).map(([slug, route]) => [route, slug])
);
