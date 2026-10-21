// lib/resourceHub.ts
// Figures for the resources landing page: how many public items each board
// holds and what was added last, so each card shows real content.
import { supabaseAnon } from "@/lib/supabaseServer";
import { CACHE_TAGS, cachedPublicQuery } from "@/lib/publicCache";

export type BoardStat = { slug: string; count: number; latestTitle: string | null; latestDate: string | null };

async function fetchBoardStatsUncached(): Promise<BoardStat[]> {
  const sb = supabaseAnon();
  const { data: boards } = await sb.from("boards").select("id,slug");
  if (!boards) return [];
  return Promise.all(
    boards.map(async (b: { id: number; slug: string }) => {
      const base = () => sb.from("resources").select("title,published_at,posted_at", { count: "exact" }).eq("board_id", b.id).eq("visibility", "public").is("deleted_at", null);
      const { data, count } = await base().order("published_at", { ascending: false, nullsFirst: false }).order("id", { ascending: false }).limit(1);
      const top = (data ?? [])[0] as { title: string | null; published_at: string | null; posted_at: string | null } | undefined;
      return { slug: b.slug, count: count ?? 0, latestTitle: top?.title ?? null, latestDate: top?.published_at ?? top?.posted_at ?? null };
    }),
  );
}

export const fetchBoardStats = cachedPublicQuery(fetchBoardStatsUncached, "resourceHub:boardStats", [CACHE_TAGS.resources, CACHE_TAGS.boards]);

export type EventStat = { category: string; count: number; latestTitle: string | null; latestDate: string | null };

async function fetchEventStatsUncached(): Promise<EventStat[]> {
  const sb = supabaseAnon();
  const { data } = await sb
    .from("events")
    .select("category,title_ko,event_date")
    .eq("visibility", "public")
    .order("event_date", { ascending: false, nullsFirst: false });
  const map = new Map<string, EventStat>();
  for (const e of (data ?? []) as { category: string; title_ko: string; event_date: string | null }[]) {
    const cur = map.get(e.category);
    if (cur) cur.count++;
    else map.set(e.category, { category: e.category, count: 1, latestTitle: e.title_ko, latestDate: e.event_date });
  }
  return [...map.values()];
}

export const fetchEventStats = cachedPublicQuery(fetchEventStatsUncached, "resourceHub:eventStats", [CACHE_TAGS.events]);
