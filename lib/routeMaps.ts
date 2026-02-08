export const boardSlugToRoute: Record<string, string> = {
  lecture: "lecture",
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

export function toRoute(boardSlug: string) {
  return boardSlugToRoute[boardSlug] ?? boardSlug;
}

export function toBoardSlug(route: string) {
  return routeToBoardSlug[route] ?? route;
}