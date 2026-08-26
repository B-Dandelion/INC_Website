import Link from "next/link";
import FormSubmitButton from "@/components/admin/FormSubmitButton";
import { supabaseService } from "@/lib/supabaseServer";
import {
  createNoticeAction,
  deleteNoticeAction,
  updateNoticeAction,
} from "./actions";
import { ArrowLeft, ExternalLink, Megaphone, Pin } from "lucide-react";

export const dynamic = "force-dynamic";

type AdminNoticeRow = {
  id: number;
  title: string;
  content: string;
  posted_at: string | null;
  pinned: boolean | null;
  visibility: string | null;
  created_at: string | null;
};

function todayInKorea() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function duplicateKey(row: AdminNoticeRow) {
  return [row.title.trim(), row.content.trim(), row.posted_at ?? ""].join("\u0000");
}

function statusMessage(status?: string) {
  if (status === "created") return "공지사항을 등록했습니다.";
  if (status === "updated") return "공지사항을 수정했습니다.";
  if (status === "deleted") return "공지사항을 삭제했습니다.";
  return null;
}

const fieldClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#2B6CA3] focus:ring-2 focus:ring-[#2B6CA3]/10";
const labelClass = "grid gap-2 text-sm font-semibold text-slate-700";
const secondaryButtonClass =
  "inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50";

export default async function AdminNoticesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const message = statusMessage(sp.status);

  const { data, error } = await supabaseService()
    .from("notices")
    .select("id,title,content,posted_at,pinned,visibility,created_at")
    .order("pinned", { ascending: false })
    .order("posted_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(200);

  if (error) {
    throw new Error(`공지사항 목록 조회 실패: ${error.message}`);
  }

  const rows = (data ?? []) as AdminNoticeRow[];
  const duplicateCounts = new Map<string, number>();
  for (const row of rows) {
    const key = duplicateKey(row);
    duplicateCounts.set(key, (duplicateCounts.get(key) ?? 0) + 1);
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-12 md:px-6 md:py-16">
      <section className="border-b border-slate-300 pb-6">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#2B6CA3]">INC Administration</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-slate-950">공지사항 관리</h1>
            <p className="mt-2 text-sm text-slate-500">공지 작성, 수정, 상단 고정 및 삭제를 관리합니다.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/admin-x7k3p9/resources" className={secondaryButtonClass}>
              <ArrowLeft className="h-4 w-4" />
              관리자 홈
            </Link>
            <Link href="/notice" className={secondaryButtonClass}>
              공지 화면
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
            <Megaphone className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">새 공지 등록</h2>
            <p className="mt-0.5 text-xs text-slate-500">공개 페이지에 표시할 공지를 작성합니다.</p>
          </div>
        </div>

        <form action={createNoticeAction} className="grid gap-5 p-5 md:p-6">
          <label className={labelClass}>
            제목
            <input name="title" maxLength={200} required autoComplete="off" className={fieldClass} />
          </label>

          <label className={labelClass}>
            내용
            <textarea
              name="content"
              maxLength={20000}
              required
              rows={8}
              className={`${fieldClass} resize-y leading-6`}
            />
          </label>

          <div className="grid gap-4 md:grid-cols-[220px_1fr] md:items-end">
            <label className={labelClass}>
              게시일
              <input type="date" name="posted_at" defaultValue={todayInKorea()} required className={fieldClass} />
            </label>

            <label className="flex h-10 items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" name="pinned" className="h-4 w-4 accent-[#174A7E]" />
              상단 고정
            </label>
          </div>

          <div className="flex justify-end border-t border-slate-100 pt-5">
            <FormSubmitButton label="공지 등록" pendingLabel="등록 중..." />
          </div>
        </form>
      </section>

      <section className="mt-10">
        <div className="flex items-end justify-between border-b border-slate-300 pb-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">등록된 공지</h2>
            <p className="mt-1 text-sm text-slate-500">기존 공지를 열어 수정하거나 삭제할 수 있습니다.</p>
          </div>
          <span className="text-xs font-medium tabular-nums text-slate-400">{rows.length} items</span>
        </div>

        {rows.length === 0 ? (
          <div className="mt-5 border border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-400">
            등록된 공지사항이 없습니다.
          </div>
        ) : (
          <div className="mt-5 grid gap-3">
            {rows.map((row) => {
              const duplicates = duplicateCounts.get(duplicateKey(row)) ?? 1;
              return (
                <article
                  key={row.id}
                  className={`border bg-white ${duplicates > 1 ? "border-amber-300" : "border-slate-200"}`}
                >
                  <div className="flex flex-col justify-between gap-4 px-5 py-4 sm:flex-row sm:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {row.pinned ? (
                          <span className="inline-flex items-center gap-1 border border-[#BDD2E6] bg-[#EEF4FA] px-2 py-0.5 text-[11px] font-bold text-[#174A7E]">
                            <Pin className="h-3 w-3" />
                            고정
                          </span>
                        ) : null}
                        <strong className="truncate text-[15px] font-semibold text-slate-900">{row.title}</strong>
                        {duplicates > 1 ? (
                          <span className="border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                            동일 공지 {duplicates}개
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-2 text-xs tabular-nums text-slate-400">
                        ID {row.id} · 게시 {row.posted_at ?? "-"} · {row.visibility ?? "-"}
                      </div>
                    </div>

                    <Link
                      href={`/notice/${row.id}`}
                      className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#174A7E] hover:underline"
                    >
                      보기
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                  <details className="border-t border-slate-100 px-5 py-4">
                    <summary className="cursor-pointer select-none text-sm font-semibold text-slate-700">수정 / 삭제</summary>

                    <form action={updateNoticeAction} className="mt-5 grid gap-4">
                      <input type="hidden" name="id" value={row.id} />

                      <label className={labelClass}>
                        제목
                        <input name="title" defaultValue={row.title} maxLength={200} required className={fieldClass} />
                      </label>

                      <label className={labelClass}>
                        내용
                        <textarea
                          name="content"
                          defaultValue={row.content}
                          maxLength={20000}
                          required
                          rows={7}
                          className={`${fieldClass} resize-y leading-6`}
                        />
                      </label>

                      <div className="grid gap-4 md:grid-cols-[220px_1fr] md:items-end">
                        <label className={labelClass}>
                          게시일
                          <input
                            type="date"
                            name="posted_at"
                            defaultValue={row.posted_at ?? todayInKorea()}
                            required
                            className={fieldClass}
                          />
                        </label>
                        <label className="flex h-10 items-center gap-2 text-sm font-semibold text-slate-700">
                          <input
                            type="checkbox"
                            name="pinned"
                            defaultChecked={Boolean(row.pinned)}
                            className="h-4 w-4 accent-[#174A7E]"
                          />
                          상단 고정
                        </label>
                      </div>

                      <div className="flex justify-end border-t border-slate-100 pt-4">
                        <FormSubmitButton label="수정 저장" pendingLabel="저장 중..." />
                      </div>
                    </form>

                    <form
                      action={deleteNoticeAction}
                      className="mt-5 flex flex-col justify-between gap-4 border-t border-slate-200 pt-4 sm:flex-row sm:items-center"
                    >
                      <input type="hidden" name="id" value={row.id} />
                      <label className="flex items-center gap-2 text-sm font-semibold text-red-700">
                        <input type="checkbox" name="confirm_delete" required className="h-4 w-4 accent-red-700" />
                        이 공지를 삭제하는 것을 확인합니다.
                      </label>
                      <FormSubmitButton label="삭제" pendingLabel="삭제 중..." danger />
                    </form>
                  </details>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
