import ResourcesFrame, {
  NAV,
} from "@/components/resources/AdminResourcesFrame";
import styles from "@/components/resources/SimpleListPage.module.css";
import { createClient } from "@supabase/supabase-js";
import { fetchEventAssets } from "@/lib/eventsDb";
import AdminEventDetailClient from "@/components/admin/AdminEventDetailClient";
import { adminSlugToEventCategory } from "@/lib/eventCategoryMap";

export const runtime = "nodejs";

const sb = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export default async function AdminEventDetailPage({
  params,
}: {
  params: Promise<{ slug: string; eventId: string }>;
}) {
  const { slug, eventId } = await params;
  const categoryMap = adminSlugToEventCategory(slug);

  const boardLabel =
    NAV.find((x) => x.key === (slug as any))?.label ?? slug;

  const { data: event, error } = await sb
    .from("events")
    .select(
      `id, category, subtype, series_year, title_ko, title_en, event_date, period_end,
       visibility, location_ko, location_en, start_time, end_time`
    )
    .eq("id", eventId)
    .maybeSingle();

  const categoryMismatch =
    !categoryMap || event?.category !== categoryMap.category;

  if (error || !event || categoryMismatch) {
    return (
      <ResourcesFrame activeKey={slug as any}>
        <div className={styles.content}>
          <div className={styles.card}>
            <div className={styles.muted}>
              이 카테고리에서 관리할 수 없는 행사이거나 행사를 찾을 수
              없습니다.
            </div>
          </div>
        </div>
      </ResourcesFrame>
    );
  }

  const assets = await fetchEventAssets(eventId);

  return (
    <ResourcesFrame activeKey={slug as any}>
      <div className={styles.content}>
        <div className={styles.hero}>
          <h1 className={styles.h1}>관리: {boardLabel}</h1>
          <div className={styles.meta}>행사 상세 관리</div>
        </div>

        <AdminEventDetailClient
          slug={slug}
          event={event as any}
          assets={assets as any}
        />
      </div>
    </ResourcesFrame>
  );
}
