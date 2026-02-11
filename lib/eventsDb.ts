// lib/eventsDb.ts
import { createSupabaseServerClient } from "./supabaseServer";

export type EventRow = {
  id: string;
  category: string;
  subtype: string | null;
  series_year: number | null;
  title_ko: string;
  event_date: string | null;
  period_end: string | null;   // end
  visibility: string;
};

export type EventAssetRow = {
  role: string;
  sort_order: number;
  id: string | null;
  award: string | null;
  person_ko: string | null;
  person_en: string | null;
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
    .select("id, category, subtype, series_year, title_ko, event_date, period_end, visibility")
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
      person_en,
      item_title_ko,
      item_title_en,
      resources:resources!event_assets_resource_id_fkey(
        id, title, mime, original_filename
      )
    `)
    .eq("event_id", eventId)
    // role로 한번 묶어주고(포스터/사진/수상자/자료)
    .order("role", { ascending: true })
    // 그 다음 sort_order
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as EventAssetRow[];
}