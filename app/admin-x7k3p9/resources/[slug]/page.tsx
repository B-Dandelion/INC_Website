import { notFound, redirect } from "next/navigation";
import { Plus, Upload } from "lucide-react";
import ResourcesFrame, { NAV, eventHref, newEventHref } from "@/components/resources/AdminResourcesFrame";
import ResourceFilters from "@/components/admin/resources/ResourceFilters";
import ResourceTable from "@/components/admin/resources/ResourceTable";
import { ButtonLink, EmptyState, PageHeader, Pagination } from "@/components/admin/ui";
import { boardRule } from "@/lib/boardRules";
import { fetchAdminEvents } from "@/lib/adminEventsDb";
import { fetchAdminResources } from "@/lib/adminResourcesDb";

const PAGE_SIZE = 30;

type BoardSearchParams = {
  page?: string;
  subtype?: string;
  event?: string;
  q?: string;
  visibility?: string;
  kind?: string;
};

export default async function AdminBoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<BoardSearchParams>;
}) {
  const { slug } = await params;

  const rule = boardRule(slug);
  if (!rule) notFound();
  const sp = await searchParams;

  // Event boards have no list of their own: open the newest event, whose page
  // keeps the full event list in the sidebar. Only an empty board stays here.
  if (rule.type === "event") {
    const subtype = rule.subtypes?.some((s) => s.value === sp.subtype) ? sp.subtype : rule.defaultSubtype;
    const events = await fetchAdminEvents(rule.category, subtype);
    if (events[0]) redirect(eventHref(slug, events[0].id));
    return (
      <ResourcesFrame activeKey={slug} subtype={subtype}>
        <div className="grid gap-5">
          <PageHeader eyebrow="자료실" title={rule.label} />
          <div className="border border-slate-200 bg-white">
            <EmptyState
              title="아직 등록된 행사가 없습니다."
              description="행사를 만든 뒤 포스터·사진·자료를 붙일 수 있습니다."
              action={
                <ButtonLink href={newEventHref(slug, subtype)} variant="primary" icon={<Plus className="h-4 w-4" aria-hidden="true" />}>
                  새 행사 추가
                </ButtonLink>
              }
            />
          </div>
        </div>
      </ResourcesFrame>
    );
  }

  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const q = (sp.q ?? "").trim();
  const { rows, total } = await fetchAdminResources({
    boardSlug: slug,
    page,
    pageSize: PAGE_SIZE,
    q,
    visibility: sp.visibility,
    kind: sp.kind,
  });

  const boardLabel = NAV.find((x) => x.key === slug)?.label ?? slug;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(total, page * PAGE_SIZE);
  const filtered = Boolean(q || sp.visibility || sp.kind);
  const uploadHref = `/admin-x7k3p9/resources/${slug}/upload`;

  function pageHref(p: number) {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (sp.visibility) next.set("visibility", sp.visibility);
    if (sp.kind) next.set("kind", sp.kind);
    if (p > 1) next.set("page", String(p));
    const qs = next.toString();
    return `/admin-x7k3p9/resources/${slug}${qs ? `?${qs}` : ""}`;
  }

  return (
    <ResourcesFrame activeKey={slug}>
      <div className="grid gap-5">
        <PageHeader
          eyebrow="자료실"
          title={boardLabel}
          description="공개 범위는 목록에서 바로 바꿀 수 있고, 연필 아이콘으로 제목·날짜·메모를 고칠 수 있습니다."
          actions={
            <ButtonLink href={uploadHref} variant="primary" icon={<Upload className="h-4 w-4" aria-hidden="true" />}>
              자료 올리기
            </ButtonLink>
          }
        />

        <div>
          <ResourceFilters key={slug} total={total} from={from} to={to} />
          {rows.length === 0 ? (
            <div className="border border-slate-200 bg-white">
              {filtered ? (
                <EmptyState title="조건에 맞는 자료가 없습니다." description="검색어나 필터를 바꿔 보세요." />
              ) : (
                <EmptyState
                  title="아직 등록된 자료가 없습니다."
                  action={
                    <ButtonLink href={uploadHref} variant="primary">
                      첫 자료 올리기
                    </ButtonLink>
                  }
                />
              )}
            </div>
          ) : (
            <ResourceTable rows={rows} boardSlug={slug} query={q} />
          )}
          <Pagination page={Math.min(page, pageCount)} pageCount={pageCount} href={pageHref} />
        </div>
      </div>
    </ResourcesFrame>
  );
}
