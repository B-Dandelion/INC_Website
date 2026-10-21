// lib/eventPages.ts
// Search titles, canonical URLs and sitemap entries for the event boards.
// Each event is shown at /resources/<board>?event=<id> (seminars also carry
// ?sub=domestic|international), so every event gets its own title instead
// of the generic "자료실".
import type { Metadata } from "next";
import { fetchEvents, type EventRow } from "./eventsDb";
import { makeMetadata } from "./seo";

type Category = "seminar" | "workshop" | "project_report" | "essay_contest" | "shortform_contest";

export const EVENT_BOARDS = {
  seminar: { category: "seminar", name: "세미나", about: "INC 세미나의 포스터, 시간표, 현장 사진과 발표 자료" },
  workshop: { category: "workshop", name: "워크샵", about: "INC 워크샵의 포스터, 시간표, 현장 사진과 발표 자료" },
  "midterm-report": { category: "project_report", name: "과제 보고회", about: "INC 과제 보고회의 포스터, 현장 사진과 발표 자료" },
  "essay-contest": { category: "essay_contest", name: "에세이 경진대회", about: "INC 에세이 경진대회의 포스터, 수상작과 응모작" },
  "shortform-contest": { category: "shortform_contest", name: "숏폼영상 공모전", about: "INC 숏폼영상 공모전의 수상작 영상과 응모작" },
} as const satisfies Record<string, { category: Category; name: string; about: string }>;

export type EventBoardSlug = keyof typeof EVENT_BOARDS;

const SEMINAR_SUB = { domestic: "국내", international: "국제" } as const;

// One query parameter only: seminar pages work out 국내/국제 from the event,
// and a bare "&" would break the sitemap XML.
export function eventPath(slug: EventBoardSlug, event: Pick<EventRow, "id">) {
  return `/resources/${slug}?event=${event.id}`;
}

// Seminar sub-list to show: explicit ?sub= wins, otherwise the event's own type.
export async function seminarSub(sp: { sub?: string; event?: string }): Promise<"domestic" | "international"> {
  if (sp.sub === "domestic" || sp.sub === "international") return sp.sub;
  if (sp.event) {
    const all = await fetchEvents({ category: "seminar" });
    if (all.find((e) => e.id === sp.event)?.subtype === "domestic") return "domestic";
  }
  return "international";
}

function period(e: EventRow) {
  if (!e.event_date) return "";
  return e.period_end && e.period_end !== e.event_date ? `${e.event_date}~${e.period_end}` : e.event_date;
}

export async function eventBoardMetadata(slug: EventBoardSlug, sp: { sub?: string; event?: string }): Promise<Metadata> {
  const board = EVENT_BOARDS[slug];
  const sub = slug === "seminar" ? await seminarSub(sp) : undefined;
  const boardName = sub ? `${SEMINAR_SUB[sub]} ${board.name}` : board.name;
  const events = await fetchEvents({ category: board.category, ...(sub ? { subtype: sub } : {}) });
  const event = sp.event ? events.find((e) => e.id === sp.event) : undefined;

  if (!event) {
    const recent = events.slice(0, 3).map((e) => e.title_ko).join(", ");
    return makeMetadata({
      title: boardName,
      description: `${board.about}.${recent ? ` 최근 행사: ${recent}` : ""}`.slice(0, 160),
      path: sub ? `/resources/${slug}?sub=${sub}` : `/resources/${slug}`,
    });
  }

  const when = period(event);
  const squash = (t: string) => t.replace(/\s+/g, "");
  const named = squash(event.title_ko).includes(squash(board.name));
  return makeMetadata({
    title: `${event.title_ko}${named ? "" : ` — ${boardName}`}${when ? ` (${when.slice(0, 10)})` : ""}`,
    description: `${event.title_ko}${when ? ` (${when})` : ""}: ${board.about}.`.slice(0, 160),
    path: eventPath(slug, event),
  });
}

export async function eventSitemapPaths() {
  const out: { path: string; date: string | null }[] = [];
  for (const slug of Object.keys(EVENT_BOARDS) as EventBoardSlug[]) {
    if (slug === "seminar") {
      for (const sub of ["domestic", "international"] as const) {
        out.push({ path: `/resources/seminar?sub=${sub}`, date: null });
        for (const e of await fetchEvents({ category: "seminar", subtype: sub })) out.push({ path: eventPath(slug, e), date: e.event_date });
      }
      continue;
    }
    for (const e of await fetchEvents({ category: EVENT_BOARDS[slug].category })) out.push({ path: eventPath(slug, e), date: e.event_date });
  }
  return out;
}
