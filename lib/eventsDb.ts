// lib/eventsDb.ts
import { createSupabaseServerClient } from "./supabaseServer";

export type EventRow = {
  id: string;
  category: string;
  subtype: string | null;
  series_year: number | null;
  title_ko: string;
  title_en?: string | null;
  event_date: string | null;
  period_end: string | null;
  location_ko?: string | null;
  location_en?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  topic_ko?: string | null;
  topic_en?: string | null;
  audience_ko?: string | null;
  audience_en?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  summary_ko?: string | null;
  content_ko?: string | null;
  homepage_featured?: boolean | null;
  cta_label?: string | null;
  cta_url?: string | null;
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

const PUBLIC_EVENT_SELECT = [
  "id",
  "category",
  "subtype",
  "series_year",
  "title_ko",
  "title_en",
  "event_date",
  "period_end",
  "location_ko",
  "location_en",
  "start_time",
  "end_time",
  "topic_ko",
  "topic_en",
  "audience_ko",
  "audience_en",
  "contact_name",
  "contact_email",
  "contact_phone",
  "summary_ko",
  "content_ko",
  "homepage_featured",
  "cta_label",
  "cta_url",
  "visibility",
].join(",");

export async function fetchEvents(params: {
  category:
    | "seminar"
    | "essay_contest"
    | "shortform_contest"
    | "project_report"
    | "workshop"
    | "promotion";
  subtype?: string;
  year?: number;
}) {
  const supabase = createSupabaseServerClient();

  let query = supabase
    .from("events")
    .select(PUBLIC_EVENT_SELECT)
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

export async function fetchPromotionEvents() {
  return fetchEvents({ category: "promotion" });
}

export async function fetchPromotionEventById(eventId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("events")
    .select(PUBLIC_EVENT_SELECT)
    .eq("id", eventId)
    .eq("category", "promotion")
    .eq("visibility", "public")
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as EventRow | null;
}

export async function fetchHomepagePromotion(today: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("events")
    .select(PUBLIC_EVENT_SELECT)
    .eq("category", "promotion")
    .eq("visibility", "public")
    .eq("homepage_featured", true)
    .order("event_date", { ascending: true, nullsFirst: false })
    .limit(10);

  if (error) throw error;

  const rows = (data ?? []) as EventRow[];
  return (
    rows.find((event) => {
      const end = event.period_end ?? event.event_date;
      return !end || end >= today;
    }) ?? null
  );
}

export async function fetchEventAssets(
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
