// lib/eventsDb.ts
import { createSupabaseServerClient } from "./supabaseServer";

export type EventRow = {
  id: string;
  category: string;
  subtype: string | null;
  series_year: number | null;
  title_ko: string;
  event_date: string | null;
  visibility: string;
};

export type EventAssetRow = {
  role: string;
  sort_order: number;
  award: string | null;
  person_ko: string | null;
  item_title_ko: string | null;
  resources: {
    id: number;
    title: string | null;
    mime: string | null;
    original_filename: string | null;
  } | null;
};

export async function fetchEvents(params: {
  category: "seminar" | "essay_contest" | "shortform_contest" | "project_report";
  subtype?: string;
  year?: number;
}) {
  const supabase = createSupabaseServerClient();

  let q = supabase
    .from("events")
    .select("id, category, subtype, series_year, title_ko, event_date, visibility")
    .eq("visibility", "public")
    .eq("category", params.category);

  if (params.subtype) q = q.eq("subtype", params.subtype);
  if (typeof params.year === "number") q = q.eq("series_year", params.year);

  const { data, error } = await q.order("event_date", { ascending: false, nullsFirst: false });
  if (error) throw error;

  return (data ?? []) as EventRow[];
}

export async function fetchEventAssets(eventId: string): Promise<EventAssetRow[]> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("event_assets")
    .select(`
      role,
      sort_order,
      award,
      person_ko,
      item_title_ko,
      resources:resources!event_assets_resource_id_fkey(
        id, title, mime, original_filename
      )
    `)
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as EventAssetRow[];
}