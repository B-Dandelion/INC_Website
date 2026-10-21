// lib/eventsDb.ts
import { createSupabaseServerClient } from "./supabaseServer";
import { CACHE_TAGS, cachedPublicQuery } from "./publicCache";

export type EventRow = {
  id: string;
  category: string;
  subtype: string | null;
  series_year: number | null;
  title_ko: string;
  event_date: string | null;
  period_end: string | null;
  visibility: string;
};

export type EventAssetRow = {
  id: string;
  role: string;
  sort_order: number;
  award: string | null;
  person_ko: string | null;
  person_en: string | null;
  item_title_ko: string | null;
  item_title_en: string | null;
  resources: {
    id: number;
    title: string | null;
    mime: string | null;
    original_filename: string | null;
    source_path: string | null;
  } | null;
};

async function fetchEventsUncached(params: {
  category:
    | "seminar"
    | "essay_contest"
    | "shortform_contest"
    | "project_report"
    | "workshop";
  subtype?: string;
  year?: number;
}) {
  const supabase = createSupabaseServerClient();

  let query = supabase
    .from("events")
    .select(
      "id, category, subtype, series_year, title_ko, event_date, period_end, visibility"
    )
    .eq("visibility", "public")
    .eq("category", params.category);

  if (params.subtype) {
    query = query.eq("subtype", params.subtype);
  }

  if (typeof params.year === "number") {
    query = query.eq("series_year", params.year);
  }

  const { data, error } = await query.order("event_date", {
    ascending: false,
    nullsFirst: false,
  });

  if (error) throw error;

  return (data ?? []) as EventRow[];
}

async function fetchEventAssetsUncached(
  eventId: string
): Promise<EventAssetRow[]> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("event_assets")
    .select(
      `
      id,
      role,
      sort_order,
      award,
      person_ko,
      person_en,
      item_title_ko,
      item_title_en,
      resources:resources!event_assets_resource_id_fkey(
        id,
        title,
        mime,
        original_filename,
        source_path
      )
    `
    )
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true });

  if (error) throw error;

  return (data ?? []) as unknown as EventAssetRow[];
}

// Cached public queries (see lib/publicCache.ts).
export const fetchEvents = cachedPublicQuery(fetchEventsUncached, "eventsDb:fetchEvents", [CACHE_TAGS.events]);
export const fetchEventAssets = cachedPublicQuery(fetchEventAssetsUncached, "eventsDb:fetchEventAssets", [CACHE_TAGS.events, CACHE_TAGS.resources]);
