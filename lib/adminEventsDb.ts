// lib/adminEventsDb.ts
// Admin screens must see every event, not only public ones, so this reads with
// the service client and skips the public cache used by lib/eventsDb.ts.
import { createClient } from "@supabase/supabase-js";
import type { EventCategory } from "@/lib/boardRules";
import type { EventAssetRow } from "@/lib/eventsDb";

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

export type AdminEventListItem = {
  id: string;
  subtype: string | null;
  title_ko: string;
  event_date: string | null;
  period_end: string | null;
  visibility: string;
};

export async function fetchAdminEvents(category: EventCategory, subtype?: string): Promise<AdminEventListItem[]> {
  let query = sb.from("events").select("id, subtype, title_ko, event_date, period_end, visibility").eq("category", category);
  if (subtype) query = query.eq("subtype", subtype);
  const { data, error } = await query
    .order("event_date", { ascending: false, nullsFirst: false })
    .order("id", { ascending: true })
    .returns<AdminEventListItem[]>();
  if (error) throw new Error(error.message);
  return data ?? [];
}

// Same shape as fetchEventAssets in lib/eventsDb.ts, but with the service
// client and no cache, so member/admin-only files show up and edits appear at once.
export async function fetchAdminEventAssets(eventId: string): Promise<EventAssetRow[]> {
  const { data, error } = await sb
    .from("event_assets")
    .select(
      `id, role, sort_order, award, person_ko, person_en, item_title_ko, item_title_en,
       resources:resources!event_assets_resource_id_fkey(id, title, mime, original_filename, source_path)`,
    )
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as EventAssetRow[];
}
