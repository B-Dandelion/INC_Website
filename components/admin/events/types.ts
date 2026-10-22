// components/admin/events/types.ts
// An event row as the admin event editor reads and edits it.
export type AdminEvent = {
  id: string;
  category: string;
  subtype: string | null;
  series_year: number | null;
  title_ko: string;
  title_en: string | null;
  event_date: string | null;
  period_end: string | null;
  visibility: string;
  location_ko: string | null;
  location_en: string | null;
  start_time: string | null;
  end_time: string | null;
};
