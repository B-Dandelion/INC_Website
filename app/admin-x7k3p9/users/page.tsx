import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Mail,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  UserRound,
  UsersRound,
} from "lucide-react";
import FormSubmitButton from "@/components/admin/FormSubmitButton";
import { supabaseService } from "@/lib/supabaseServer";
import {
  approveMemberAction,
  deleteMemberAction,
  rejectMemberAction,
  resendReviewEmailAction,
  revokeMemberApprovalAction,
} from "./actions";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;
type ReviewStatus = "pending" | "approved" | "rejected";
type MailStatus = "sent" | "failed" | "not_configured" | null;

type MemberProfile = {
  id: string;
  role: string;
  approved: boolean;
  name: string | null;
  phone: string | null;
  affiliation: string | null;
  created_at: string;
  updated_at: string;
  email: string | null;
  review_status: ReviewStatus;
  rejection_reason: string | null;
  reviewed_at: string | null;
  review_notification_status: MailStatus;
  review_notification_sent_at: string | null;
  review_notification_error: string | null;
};

type AuthUserMini = {
  id: string;
  email: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
  emailConfirmed: boolean;
};

type MemberRow = MemberProfile & {
  authEmail: string | null;
  authCreatedAt: string | null;
  lastSignInAt: string | null;
  emailConfirmed: boolean;
};

function formatDateTime(value?: string | null) {
  if (!value) return "없음";
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function reviewStatus(profile: Pick<MemberProfile, "review_status" | "approved">): ReviewStatus {
  if (profile.review_status === "approved" || profile.review_status === "rejected") return profile.review_status;
  return profile.approved ? "approved" : "pending";
}

function statusLabel(status: ReviewStatus) {
  if (status === "approved") return "승인 완료";
  if (status === "rejected") return "승인 거부";
  return "승인 대기";
}

function statusClass(status: ReviewStatus) {
  if (status === "approved") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "rejected") return "border-red-200 bg-red-50 text-red-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function mailLabel(status: MailStatus) {
  if (status === "sent") return "안내 메일 발송됨";
  if (status === "failed") return "메일 발송 실패";
  if (status === "not_configured") return "메일 서비스 미설정";
  return "안내 메일 미발송";
}

function statusMessage(status?: string, mail?: string) {
  let message: string | null = null;
  if (status === "approved") message = "회원 승인을 완료했습니다.";
  if (status === "rejected") message = "회원 승인을 거부했습니다.";
  if (status === "revoked") message = "회원 승인을 취소하고 승인 대기 상태로 변경했습니다.";
  if (status === "deleted") message = "회원 계정을 삭제했습니다.";
  if (status === "resent") message = "승인 결과 안내 메일을 다시 발송했습니다.";
  if (!message) return null;

  if (mail === "sent") return { message: `${message} 안내 메일도 정상 발송되었습니다.`, warning: false };
  if (mail === "failed") return { message: `${message} 다만 안내 메일 발송에 실패했습니다. 회원 상세에서 다시 전송할 수 있습니다.`, warning: true };
  if (mail === "not_configured") return { message: `${message} 현재 메일 발송 서비스가 설정되지 않아 안내 메일은 전송되지 않았습니다.`, warning: true };
  return { message, warning: false };
}

async function fetchAuthUsers(): Promise<AuthUserMini[]> {
  const service = supabaseService();
  const rows: AuthUserMini[] = [];
  const perPage = 200;

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`회원 인증정보 조회 실패: ${error.message}`);

    const users = data?.users ?? [];
    rows.push(
      ...users.map((user) => ({
        id: user.id,
        email: user.email ?? null,
        createdAt: user.created_at ?? null,
        lastSignInAt: user.last_sign_in_at ?? null,
        emailConfirmed: Boolean(user.email_confirmed_at),
      })),
    );

    if (users.length < perPage) break;
  }

  return rows;
}

function pageHref(q: string, filter: string, page: number) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (filter !== "all") params.set("filter", filter);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin-x7k3p9/users?${query}` : "/admin-x7k3p9/users";
}

const secondaryButton =
  "inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50";
const quickApproveButton =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-[#174A7E] px-3 text-sm font-semibold text-white transition hover:bg-[#103A66]";
const quickRejectButton =
  "inline-flex h-9 cursor-pointer select-none items-center justify-center gap-1.5 rounded-md border border-red-200 bg-white px-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 [&::-webkit-details-marker]:hidden";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; page?: string; status?: string; mail?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().toLowerCase();
  const filter = ["pending", "approved", "rejected"].includes(sp.filter ?? "") ? (sp.filter as ReviewStatus) : "all";
  const requestedPage = Math.max(1, Number(sp.page ?? 1) || 1);
  const banner = statusMessage(sp.status, sp.mail);

  const service = supabaseService();
  const [{ data: profiles, error: profileError }, authUsers] = await Promise.all([
    service
      .from("profiles")
      .select("id,role,approved,name,phone,affiliation,created_at,updated_at,email,review_status,rejection_reason,reviewed_at,review_notification_status,review_notification_sent_at,review_notification_error")
      .eq("role", "member")
      .eq("hidden_from_member_management", false)
      .order("created_at", { ascending: false }),
    fetchAuthUsers(),
  ]);

  if (profileError) throw new Error(`회원 목록 조회 실패: ${profileError.message}`);

  const authMap = new Map(authUsers.map((user) => [user.id, user]));
  const allMembers: MemberRow[] = ((profiles ?? []) as MemberProfile[]).map((profile) => {
    const auth = authMap.get(profile.id);
    return {
      ...profile,
      review_status: reviewStatus(profile),
      authEmail: auth?.email ?? null,
      authCreatedAt: auth?.createdAt ?? null,
      lastSignInAt: auth?.lastSignInAt ?? null,
      emailConfirmed: auth?.emailConfirmed ?? false,
    };
  });

  const stats = {
    total: allMembers.length,
    pending: allMembers.filter((member) => member.review_status === "pending").length,
    approved: allMembers.filter((member) => member.review_status === "approved").length,
    rejected: allMembers.filter((member) => member.review_status === "rejected").length,
  };

  const searched = allMembers.filter((member) => {
    if (filter !== "all" && member.review_status !== filter) return false;
    if (!q) return true;
    return [member.name, member.email, member.authEmail, member.affiliation, member.phone]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(q));
  });

  const order: Record<ReviewStatus, number> = { pending: 0, rejected: 1, approved: 2 };
  searched.sort((a, b) => {
    const statusDiff = order[a.review_status] - order[b.review_status];
    if (statusDiff !== 0) return statusDiff;
    return (b.authCreatedAt ?? b.created_at).localeCompare(a.authCreatedAt ?? a.created_at);
  });

  const pageCount = Math.max(1, Math.ceil(searched.length / PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);
  const start = (page - 1) * PAGE_SIZE;
  const visible = searched.slice(start, start + PAGE_SIZE);

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-12 md:px-6 md:py-16">
      <section className="border-b border-slate-300 pb-6">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#2B6CA3]">INC Administration</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-slate-950">회원 관리</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              가입 회원을 심사하고 승인 결과를 관리합니다. 관리자 및 관리 제외 계정은 표시되지 않습니다.
            </p>
          </div>
          <Link href="/admin-x7k3p9/resources" className={secondaryButton}>
            <ArrowLeft className="h-4 w-4" />
            관리자 홈
          </Link>
        </div>
      </section>

      {banner ? (
        <div
          role="status"
          className={`mt-6 border px-4 py-3 text-sm font-semibold ${
            banner.warning ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {banner.message}
        </div>
      ) : null}

      <section className="mt-7 grid border border-slate-200 bg-white sm:grid-cols-2 lg:grid-cols-4">
        <div className="border-b border-slate-200 p-5 sm:border-r lg:border-b-0">
          <div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold text-slate-500">전체 회원</span><UsersRound className="h-4 w-4 text-slate-400" /></div>
          <div className="mt-3 text-3xl font-semibold tabular-nums text-slate-950">{stats.total}</div>
        </div>
        <div className="border-b border-slate-200 p-5 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold text-slate-500">승인 대기</span><Clock3 className="h-4 w-4 text-amber-600" /></div>
          <div className="mt-3 text-3xl font-semibold tabular-nums text-slate-950">{stats.pending}</div>
        </div>
        <div className="border-b border-slate-200 p-5 sm:border-b-0 sm:border-r">
          <div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold text-slate-500">승인 완료</span><CheckCircle2 className="h-4 w-4 text-emerald-600" /></div>
          <div className="mt-3 text-3xl font-semibold tabular-nums text-slate-950">{stats.approved}</div>
        </div>
        <div className="p-5">
          <div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold text-slate-500">승인 거부</span><Ban className="h-4 w-4 text-red-600" /></div>
          <div className="mt-3 text-3xl font-semibold tabular-nums text-slate-950">{stats.rejected}</div>
        </div>
      </section>

      <section className="mt-8">
        <div className="flex flex-col gap-4 border-b border-slate-300 pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">회원 목록</h2>
            <p className="mt-1 text-sm text-slate-500">승인 대기 → 승인 거부 → 승인 완료 순으로 표시합니다.</p>
          </div>

          <form action="/admin-x7k3p9/users" method="get" className="flex flex-col gap-2 sm:flex-row" role="search">
            <div className="relative min-w-0 sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input name="q" type="search" defaultValue={sp.q ?? ""} placeholder="이름, 이메일, 소속 검색" aria-label="회원 검색" className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-[#2B6CA3] focus:ring-2 focus:ring-[#2B6CA3]/10" />
            </div>
            <select name="filter" defaultValue={filter} aria-label="승인 상태 필터" className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-[#2B6CA3]">
              <option value="all">전체 상태</option>
              <option value="pending">승인 대기</option>
              <option value="approved">승인 완료</option>
              <option value="rejected">승인 거부</option>
            </select>
            <button type="submit" className="h-10 rounded-md bg-[#174A7E] px-4 text-sm font-semibold text-white transition hover:bg-[#103A66]">적용</button>
          </form>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-400">
          <span>{searched.length}명 표시</span>
          {(q || filter !== "all") ? <Link href="/admin-x7k3p9/users" className="font-semibold text-[#174A7E] hover:underline">필터 초기화</Link> : null}
        </div>

        {visible.length === 0 ? (
          <div className="mt-4 border border-slate-200 bg-white px-5 py-14 text-center">
            <UserRound className="mx-auto h-6 w-6 text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-700">조건에 맞는 회원이 없습니다.</p>
            <p className="mt-1 text-sm text-slate-400">검색어나 승인 상태 필터를 변경해 보세요.</p>
          </div>
        ) : (
          <div className="mt-4 border border-slate-200 bg-white">
            {visible.map((member, index) => {
              const email = member.authEmail || member.email || "이메일 없음";
              const joinedAt = member.authCreatedAt || member.created_at;
              return (
                <article key={member.id} className={index !== visible.length - 1 ? "border-b border-slate-100" : ""}>
                  <div className="grid gap-4 px-5 py-5 lg:grid-cols-[minmax(220px,1.3fr)_minmax(220px,1fr)_150px_auto] lg:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="truncate text-[15px] font-semibold text-slate-950">{member.name || "이름 미등록"}</strong>
                        <span className={`border px-2 py-0.5 text-[11px] font-bold ${statusClass(member.review_status)}`}>{statusLabel(member.review_status)}</span>
                        {!member.emailConfirmed ? <span className="border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-500">이메일 미확인</span> : null}
                      </div>
                      <p className="mt-1.5 truncate text-sm text-slate-500">{member.affiliation || "소속 미등록"}</p>
                    </div>

                    <div className="min-w-0 text-sm text-slate-600">
                      <div className="flex min-w-0 items-center gap-2"><Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" /><span className="truncate">{email}</span></div>
                      <div className="mt-1.5 text-xs text-slate-400">{member.phone || "전화번호 없음"}</div>
                    </div>

                    <div className="text-xs leading-5 text-slate-400">
                      <div className="font-semibold text-slate-500">가입</div>
                      <div className="mt-0.5 tabular-nums">{formatDateTime(joinedAt)}</div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      {member.review_status === "pending" ? (
                        <>
                          <form action={approveMemberAction}>
                            <input type="hidden" name="id" value={member.id} />
                            <FormSubmitButton label="승인" pendingLabel="처리 중..." className={quickApproveButton} />
                          </form>
                          <details className="relative">
                            <summary className={quickRejectButton}><Ban className="h-3.5 w-3.5" />거부</summary>
                            <div className="absolute right-0 z-20 mt-2 w-[340px] max-w-[80vw] border border-slate-200 bg-white p-4 text-left shadow-[0_12px_32px_rgba(15,23,42,0.14)]">
                              <form action={rejectMemberAction} className="grid gap-3">
                                <input type="hidden" name="id" value={member.id} />
                                <div>
                                  <div className="text-sm font-semibold text-slate-900">승인 거부</div>
                                  <p className="mt-1 text-xs leading-5 text-slate-500">거부 사유는 선택 사항이며 입력하면 안내 메일에도 포함됩니다.</p>
                                </div>
                                <textarea name="rejection_reason" maxLength={1000} rows={4} placeholder="승인 거부 사유 (선택)" className="w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#2B6CA3]" />
                                <FormSubmitButton label="거부 확정" pendingLabel="처리 중..." className="h-9 rounded-md bg-red-700 px-3 text-sm font-semibold text-white hover:bg-red-800" />
                              </form>
                            </div>
                          </details>
                        </>
                      ) : member.review_status === "rejected" ? (
                        <form action={approveMemberAction}>
                          <input type="hidden" name="id" value={member.id} />
                          <FormSubmitButton label="다시 승인" pendingLabel="처리 중..." className={quickApproveButton} />
                        </form>
                      ) : null}

                      <details className="group">
                        <summary className="inline-flex h-9 cursor-pointer select-none items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 [&::-webkit-details-marker]:hidden">상세 관리</summary>
                      </details>
                    </div>
                  </div>

                  <details className="border-t border-slate-100 px-5 py-4">
                    <summary className="cursor-pointer select-none text-sm font-semibold text-slate-600 hover:text-[#174A7E]">회원 상세정보 및 추가 관리</summary>
                    <div className="mt-5 grid gap-6 border-t border-slate-100 pt-5">
                      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                        <div><div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">Name</div><div className="mt-1.5 text-sm font-semibold text-slate-800">{member.name || "미등록"}</div></div>
                        <div><div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">Affiliation</div><div className="mt-1.5 text-sm font-semibold text-slate-800">{member.affiliation || "미등록"}</div></div>
                        <div><div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">Last sign in</div><div className="mt-1.5 text-sm text-slate-700">{formatDateTime(member.lastSignInAt)}</div></div>
                        <div><div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">Reviewed</div><div className="mt-1.5 text-sm text-slate-700">{formatDateTime(member.reviewed_at)}</div></div>
                      </div>

                      {member.review_status === "rejected" && member.rejection_reason ? (
                        <div className="border-l-2 border-red-300 bg-red-50/60 px-4 py-3">
                          <div className="text-xs font-bold text-red-700">승인 거부 사유</div>
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{member.rejection_reason}</p>
                        </div>
                      ) : null}

                      {member.review_status !== "pending" ? (
                        <div className="flex flex-col justify-between gap-3 border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center">
                          <div>
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Send className="h-4 w-4 text-[#174A7E]" />{mailLabel(member.review_notification_status)}</div>
                            {member.review_notification_sent_at ? <p className="mt-1 text-xs text-slate-500">최근 발송: {formatDateTime(member.review_notification_sent_at)}</p> : null}
                            {member.review_notification_error ? <p className="mt-1 max-w-2xl text-xs leading-5 text-amber-700">{member.review_notification_error}</p> : null}
                          </div>
                          <form action={resendReviewEmailAction}>
                            <input type="hidden" name="id" value={member.id} />
                            <FormSubmitButton label="안내 메일 재전송" pendingLabel="전송 중..." className={secondaryButton} />
                          </form>
                        </div>
                      ) : null}

                      <div className="flex flex-col justify-between gap-4 border-t border-slate-100 pt-5 lg:flex-row lg:items-start">
                        <div className="flex flex-wrap gap-2">
                          {member.review_status === "approved" ? (
                            <form action={revokeMemberApprovalAction}>
                              <input type="hidden" name="id" value={member.id} />
                              <FormSubmitButton label="승인 취소" pendingLabel="처리 중..." className={secondaryButton} />
                            </form>
                          ) : null}
                          {member.review_status === "rejected" ? (
                            <details className="relative">
                              <summary className={secondaryButton}>거부 사유 수정</summary>
                              <div className="mt-3 w-full max-w-xl border border-slate-200 bg-white p-4">
                                <form action={rejectMemberAction} className="grid gap-3">
                                  <input type="hidden" name="id" value={member.id} />
                                  <textarea name="rejection_reason" defaultValue={member.rejection_reason ?? ""} maxLength={1000} rows={4} className="w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#2B6CA3]" />
                                  <p className="text-xs leading-5 text-slate-500">저장하면 거부 상태가 유지되고 변경된 사유로 안내 메일이 다시 발송됩니다.</p>
                                  <FormSubmitButton label="사유 저장 및 메일 발송" pendingLabel="처리 중..." className="h-9 rounded-md bg-[#174A7E] px-3 text-sm font-semibold text-white" />
                                </form>
                              </div>
                            </details>
                          ) : null}
                        </div>

                        <div className="w-full max-w-sm border border-red-100 bg-red-50/40 p-4">
                          <div className="flex items-center gap-2 text-sm font-semibold text-red-800"><AlertTriangle className="h-4 w-4" />회원 계정 삭제</div>
                          <p className="mt-1 text-xs leading-5 text-slate-500">Supabase 인증 계정과 회원 프로필을 모두 삭제합니다. 되돌릴 수 없습니다.</p>
                          <form action={deleteMemberAction} className="mt-3 grid gap-2">
                            <input type="hidden" name="id" value={member.id} />
                            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" name="confirm_delete" required className="h-4 w-4 accent-red-700" />삭제 내용을 확인했습니다.</label>
                            <FormSubmitButton label="회원 삭제" pendingLabel="삭제 중..." className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-red-700 px-3 text-sm font-semibold text-white hover:bg-red-800" />
                          </form>
                        </div>
                      </div>
                    </div>
                  </details>
                </article>
              );
            })}
          </div>
        )}

        {pageCount > 1 ? (
          <nav className="mt-6 flex items-center justify-center gap-2" aria-label="회원 목록 페이지">
            {page > 1 ? <Link href={pageHref(q, filter, page - 1)} className={secondaryButton}><ChevronLeft className="h-4 w-4" />이전</Link> : null}
            <span className="px-3 text-sm font-semibold tabular-nums text-slate-600">{page} / {pageCount}</span>
            {page < pageCount ? <Link href={pageHref(q, filter, page + 1)} className={secondaryButton}>다음<ChevronRight className="h-4 w-4" /></Link> : null}
          </nav>
        ) : null}
      </section>
    </main>
  );
}
