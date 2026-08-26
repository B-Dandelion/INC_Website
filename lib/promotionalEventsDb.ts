import { createSupabaseServerClient } from "./supabaseServer";

export type PromotionEventRow = {
  id: string;
  title_ko: string;
  summary_ko: string | null;
  content_ko: string | null;
  topic_ko: string | null;
  event_date: string | null;
  period_end: string | null;
  start_time: string | null;
  end_time: string | null;
  location_ko: string | null;
  audience_ko: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  cta_label: string | null;
  cta_url: string | null;
  homepage_featured: boolean;
  visibility: string;
};

const PROMOTION_SELECT =
  "id,title_ko,summary_ko,content_ko,topic_ko,event_date,period_end,start_time,end_time,location_ko,audience_ko,contact_name,contact_email,contact_phone,cta_label,cta_url,homepage_featured,visibility" as const;

export async function fetchPromotionEvents() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("events")
    .select(PROMOTION_SELECT)
    .eq("category", "promotion")
    .eq("visibility", "public")
    .order("event_date", { ascending: false, nullsFirst: false });

  if (error) throw error;
  return (data ?? []) as unknown as PromotionEventRow[];
}

export async function fetchPromotionEventById(eventId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("events")
    .select(PROMOTION_SELECT)
    .eq("id", eventId)
    .eq("category", "promotion")
    .eq("visibility", "public")
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as unknown as PromotionEventRow | null;
}

export async function fetchHomepagePromotion(today: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("events")
    .select(PROMOTION_SELECT)
    .eq("category", "promotion")
    .eq("visibility", "public")
    .eq("homepage_featured", true)
    .order("event_date", { ascending: true, nullsFirst: false })
    .limit(10);

  if (error) throw error;

  const rows = (data ?? []) as unknown as PromotionEventRow[];
  return (
    rows.find((event) => {
      const end = event.period_end ?? event.event_date;
      return !end || end >= today;
    }) ?? null
  );
}
