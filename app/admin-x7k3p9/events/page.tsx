import Link from "next/link";
import { ArrowLeft, CalendarDays, ExternalLink, Star } from "lucide-react";
import FormSubmitButton from "@/components/admin/FormSubmitButton";
import { supabaseService } from "@/lib/supabaseServer";
import {
  createPromotionEventAction,
  deletePromotionEventAction,
  updatePromotionEventAction,
} from "./actions";

export const dynamic = "force-dynamic";

type AdminEventRow = {
  id: string;
  title_ko: string;
  summary_ko: string | null;
  content_ko: string | null;
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
  homepage_featured: boolean | null;
  visibility: string | null;
};

function statusMessage(status?: string) {
  if (status === "created") return "이벤트를 등록했습니다.";
  if (status === "updated") return "이벤트를 수정했습니다.";
  if (status === "deleted") return "이벤트를 삭제했습니다.";
  return null;
}

function timeValue(value?: string | null) {
  return value ? value.slice(0, 5) : "";
}

const fieldClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#2B6CA3] focus:ring-2 focus:ring-[#2B6CA3]/10";
const labelClass = "grid gap-2 text-sm font-semibold text-slate-700";
const secondaryButtonClass =
  "inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50";

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const message = statusMessage(sp.status);

  const { data, error } = await supabaseService()
    .from("events")
    .select(
      "id,title_ko,summary_ko,content_ko,event_date,period_end,start_time,end_time,location_ko,audience_ko,contact_name,contact_email,contact_phone,cta_label,cta_url,homepage_featured,visibility"
    )
    .eq("category", "promotion")
    .order("homepage_featured", { ascending: false })
    .order("event_date", { ascending: false, nullsFirst: false });

  if (error) throw new Error(`이벤트 목록 조회 실패: ${error.message}`);
  const rows = (data ?? []) as AdminEventRow[];

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-12 md:px-6 md:py-16">
      <section className="border-b border-slate-300 pb-6">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#2B6CA3]">INC Administration</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-slate-950">이벤트 관리</h1>
            <p className="mt-2 text-sm text-slate-500">메인 화면에서 홍보할 행사와 이벤트 상세 내용을 관리합니다.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/admin-x7k3p9/resources" className={secondaryButtonClass}>
              <ArrowLeft className="h-4 w-4" />
              관리자 홈
            </Link>
            <Link href="/events" className={secondaryButtonClass}>
              이벤트 화면
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {message ? (
        <div role="status" className="mt-6 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {message}
        </div>
      ) : null}

      <section className="mt-8 border border-slate-200 bg-white">
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#EEF4FA] text-[#174A7E]">
            <CalendarDays className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">새 이벤트 등록</h2>
            <p className="mt-0.5 text-xs text-slate-500">공개 이벤트 페이지와 메인 홍보 영역에 사용할 내용을 입력합니다.</p>
          </div>
        </div>

        <form action={createPromotionEventAction} className="grid gap-5 p-5 md:p-6">
          <label className={labelClass}>
            이벤트 제목
            <input name="title_ko" maxLength={200} required className={fieldClass} />
          </label>

          <label className={labelClass}>
            한 줄 요약
            <textarea name="summary_ko" maxLength={500} rows={2} className={`${fieldClass} resize-y leading-6`} placeholder="메인 홍보 카드와 이벤트 목록에 표시됩니다." />
          </label>

          <label className={labelClass}>
            상세 안내
            <textarea name="content_ko" maxLength={20000} rows={8} className={`${fieldClass} resize-y leading-7`} />
          </label>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <label className={labelClass}>
              시작일
              <input type="date" name="event_date" className={fieldClass} />
            </label>
            <label className={labelClass}>
              종료일
              <input type="date" name="period_end" className={fieldClass} />
            </label>
            <label className={labelClass}>
              시작 시간
              <input type="time" name="start_time" className={fieldClass} />
            </label>
            <label className={labelClass}>
              종료 시간
              <input type="time" name="end_time" className={fieldClass} />
            </label>
          </div>

          <label className={labelClass}>
            장소
            <input name="location_ko" maxLength={300} className={fieldClass} />
          </label>

          <label className={labelClass}>
            참여 대상
            <input name="audience_ko" className={fieldClass} />
          </label>

          <div className="grid gap-4 md:grid-cols-3">
            <label className={labelClass}>
              문의 담당자
              <input name="contact_name" className={fieldClass} />
            </label>
            <label className={labelClass}>
              문의 이메일
              <input type="email" name="contact_email" className={fieldClass} />
            </label>
            <label className={labelClass}>
              문의 전화
              <input name="contact_phone" className={fieldClass} />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
            <label className={labelClass}>
              외부 버튼 문구
              <input name="cta_label" maxLength={100} className={fieldClass} placeholder="예: 사전등록" />
            </label>
            <label className={labelClass}>
              연결 주소
              <input name="cta_url" className={fieldClass} placeholder="https://... 또는 /로 시작하는 내부 주소" />
            </label>
          </div>

          <div className="flex flex-wrap gap-x-8 gap-y-3 border-t border-slate-100 pt-5">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" name="visibility_public" defaultChecked className="h-4 w-4 accent-[#174A7E]" />
              공개
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" name="homepage_featured" className="h-4 w-4 accent-[#174A7E]" />
              메인 화면에 홍보
            </label>
          </div>

          <div className="flex justify-end border-t border-slate-100 pt-5">
            <FormSubmitButton label="이벤트 등록" pendingLabel="등록 중..." />
          </div>
        </form>
      </section>

      <section className="mt-10">
        <div className="flex items-end justify-between border-b border-slate-300 pb-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">등록된 이벤트</h2>
            <p className="mt-1 text-sm text-slate-500">‘메인 화면에 홍보’는 한 이벤트만 활성화됩니다.</p>
          </div>
          <span className="text-xs font-medium tabular-nums text-slate-400">{rows.length} items</span>
        </div>

        {rows.length === 0 ? (
          <div className="mt-5 border border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-400">등록된 이벤트가 없습니다.</div>
        ) : (
          <div className="mt-5 grid gap-3">
            {rows.map((row) => (
              <article key={row.id} className="border border-slate-200 bg-white">
                <div className="flex flex-col justify-between gap-4 px-5 py-4 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {row.homepage_featured ? (
                        <span className="inline-flex items-center gap-1 border border-[#BDD2E6] bg-[#EEF4FA] px-2 py-0.5 text-[11px] font-bold text-[#174A7E]">
                          <Star className="h-3 w-3" />
                          메인 홍보
                        </span>
                      ) : null}
                      <strong className="text-[15px] font-semibold text-slate-900">{row.title_ko}</strong>
                      <span className={`px-2 py-0.5 text-[11px] font-bold ${row.visibility === "public" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {row.visibility === "public" ? "공개" : "비공개"}
                      </span>
                    </div>
                    <div className="mt-2 text-xs tabular-nums text-slate-400">
                      {row.event_date ?? "일정 미정"}{row.period_end ? ` ~ ${row.period_end}` : ""}
                      {row.location_ko ? ` · ${row.location_ko}` : ""}
                    </div>
                    {row.summary_ko ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{row.summary_ko}</p> : null}
                  </div>

                  {row.visibility === "public" ? (
                    <Link href={`/events/${row.id}`} className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#174A7E] hover:underline">
                      보기
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  ) : null}
                </div>

                <details className="border-t border-slate-100 px-5 py-4">
                  <summary className="cursor-pointer select-none text-sm font-semibold text-slate-700">수정 / 삭제</summary>

                  <form action={updatePromotionEventAction} className="mt-5 grid gap-4">
                    <input type="hidden" name="id" value={row.id} />
                    <label className={labelClass}>
                      이벤트 제목
                      <input name="title_ko" defaultValue={row.title_ko} maxLength={200} required className={fieldClass} />
                    </label>
                    <label className={labelClass}>
                      한 줄 요약
                      <textarea name="summary_ko" defaultValue={row.summary_ko ?? ""} maxLength={500} rows={2} className={`${fieldClass} resize-y leading-6`} />
                    </label>
                    <label className={labelClass}>
                      상세 안내
                      <textarea name="content_ko" defaultValue={row.content_ko ?? ""} maxLength={20000} rows={7} className={`${fieldClass} resize-y leading-7`} />
                    </label>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      <label className={labelClass}>시작일<input type="date" name="event_date" defaultValue={row.event_date ?? ""} className={fieldClass} /></label>
                      <label className={labelClass}>종료일<input type="date" name="period_end" defaultValue={row.period_end ?? ""} className={fieldClass} /></label>
                      <label className={labelClass}>시작 시간<input type="time" name="start_time" defaultValue={timeValue(row.start_time)} className={fieldClass} /></label>
                      <label className={labelClass}>종료 시간<input type="time" name="end_time" defaultValue={timeValue(row.end_time)} className={fieldClass} /></label>
                    </div>

                    <label className={labelClass}>장소<input name="location_ko" defaultValue={row.location_ko ?? ""} maxLength={300} className={fieldClass} /></label>
                    <label className={labelClass}>참여 대상<input name="audience_ko" defaultValue={row.audience_ko ?? ""} className={fieldClass} /></label>

                    <div className="grid gap-4 md:grid-cols-3">
                      <label className={labelClass}>문의 담당자<input name="contact_name" defaultValue={row.contact_name ?? ""} className={fieldClass} /></label>
                      <label className={labelClass}>문의 이메일<input type="email" name="contact_email" defaultValue={row.contact_email ?? ""} className={fieldClass} /></label>
                      <label className={labelClass}>문의 전화<input name="contact_phone" defaultValue={row.contact_phone ?? ""} className={fieldClass} /></label>
                    </div>

                    <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
                      <label className={labelClass}>외부 버튼 문구<input name="cta_label" defaultValue={row.cta_label ?? ""} maxLength={100} className={fieldClass} /></label>
                      <label className={labelClass}>연결 주소<input name="cta_url" defaultValue={row.cta_url ?? ""} className={fieldClass} /></label>
                    </div>

                    <div className="flex flex-wrap gap-x-8 gap-y-3 border-t border-slate-100 pt-4">
                      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <input type="checkbox" name="visibility_public" defaultChecked={row.visibility === "public"} className="h-4 w-4 accent-[#174A7E]" />공개
                      </label>
                      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <input type="checkbox" name="homepage_featured" defaultChecked={Boolean(row.homepage_featured)} className="h-4 w-4 accent-[#174A7E]" />메인 화면에 홍보
                      </label>
                    </div>

                    <div className="flex justify-end border-t border-slate-100 pt-4">
                      <FormSubmitButton label="수정 저장" pendingLabel="저장 중..." />
                    </div>
                  </form>

                  <form action={deletePromotionEventAction} className="mt-5 flex flex-col justify-between gap-4 border-t border-slate-200 pt-4 sm:flex-row sm:items-center">
                    <input type="hidden" name="id" value={row.id} />
                    <label className="flex items-center gap-2 text-sm font-semibold text-red-700">
                      <input type="checkbox" name="confirm_delete" required className="h-4 w-4 accent-red-700" />이 이벤트를 삭제하는 것을 확인합니다.
                    </label>
                    <FormSubmitButton label="삭제" pendingLabel="삭제 중..." danger />
                  </form>
                </details>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
