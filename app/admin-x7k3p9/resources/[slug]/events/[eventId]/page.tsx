import ResourcesFrame, {
  NAV,
} from "@/components/resources/AdminResourcesFrame";
import styles from "@/components/resources/SimpleListPage.module.css";
import { createClient } from "@supabase/supabase-js";
import { fetchAdminEventAssets } from "@/lib/adminEventsDb";
import AdminEventDetailClient, { type AdminEvent } from "@/components/admin/AdminEventDetailClient";
import { adminSlugToEventCategory } from "@/lib/eventCategoryMap";
import { eventBoardRule } from "@/lib/boardRules";
import { ButtonLink, PageHeader } from "@/components/admin/ui";
import { ExternalLink } from "lucide-react";

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
    NAV.find((x) => x.key === slug)?.label ?? slug;

  const { data: event, error } = await sb
    .from("events")
    .select(
      `id, category, subtype, series_year, title_ko, title_en, event_date, period_end,
       visibility, location_ko, location_en, start_time, end_time`
    )
    .eq("id", eventId)
    .maybeSingle<AdminEvent>();

  const categoryMismatch =
    !categoryMap || event?.category !== categoryMap.category;

  if (error || !event || categoryMismatch) {
    return (
      <ResourcesFrame activeKey={slug}>
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

  const assets = await fetchAdminEventAssets(eventId);

  const subtype = event.subtype ?? undefined;
  // Where this event appears on the public site (public events only).
  const publicHref =
    slug === "seminar"
      ? `/resources/seminar?sub=${subtype === "domestic" ? "domestic" : "international"}&event=${event.id}`
      : `/resources/${slug}?event=${event.id}`;
  const subtypeLabel = eventBoardRule(slug)?.subtypes?.find((s) => s.value === subtype)?.label;

  return (
    <ResourcesFrame activeKey={slug} activeEventId={event.id} subtype={subtype}>
      <div className="grid gap-5">
        <PageHeader
          eyebrow={`자료실 · ${boardLabel}${subtypeLabel ? ` · ${subtypeLabel}` : ""}`}
          title={event.title_ko || "제목 없음"}
          description={event.visibility === "public" ? "공개 사이트에 보이는 행사입니다." : "공개 범위가 제한된 행사라 공개 사이트 목록에는 보이지 않습니다."}
          actions={
            event.visibility === "public" ? (
              <ButtonLink href={publicHref} target="_blank" rel="noopener noreferrer" icon={<ExternalLink className="h-4 w-4" aria-hidden="true" />}>
                공개 화면 보기
              </ButtonLink>
            ) : null
          }
        />

        <AdminEventDetailClient
          slug={slug}
          event={event}
          assets={assets}
        />
      </div>
    </ResourcesFrame>
  );
}
