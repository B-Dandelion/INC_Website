import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Mail,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  UsersRound,
} from "lucide-react";
import { supabaseService } from "@/lib/supabaseServer";
import {
  approveMemberAction,
  deleteMemberAction,
  revokeMemberApprovalAction,
} from "./actions";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

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

function statusMessage(status?: string) {
  if (status === "approved") return "회원 승인을 완료했습니다.";
  if (status === "revoked") return "회원 승인을 취소했습니다.";
  if (status === "deleted") return "회원 계정을 삭제했습니다.";
  return null;
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

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; page?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().toLowerCase();
  const filter = sp.filter === "pending" || sp.filter === "approved" ? sp.filter : "all";
  const requestedPage = Math.max(1, Number(sp.page ?? 1) || 1);
  const message = statusMessage(sp.status);

  const service = supabaseService();
  const [{ data: profiles, error: profileError }, authUsers] = await Promise.all([
    service
      .from("profiles")
      .select("id,role,approved,name,phone,affiliation,created_at,updated_at,email")
      .eq("role", "member")
      .order("created_at", { ascending: false }),
    fetchAuthUsers(),
  ]);

  if (profileError) throw new Error(`회원 목록 조회 실패: ${profileError.message}`);

  const authMap = new Map(authUsers.map((user) => [user.id, user]));
  const allMembers: MemberRow[] = ((profiles ?? []) as MemberProfile[]).map((profile) => {
    const auth = authMap.get(profile.id);
    return {
      ...profile,
      authEmail: auth?.email ?? null,
      authCreatedAt: auth?.createdAt ?? null,
      lastSignInAt: auth?.lastSignInAt ?? null,
      emailConfirmed: auth?.emailConfirmed ?? false,
    };
  });

  const stats = {
    total: allMembers.length,
    pending: allMembers.filter((member) => !member.approved).length,
    approved: allMembers.filter((member) => member.approved).length,
  };

  const searched = allMembers.filter((member) => {
    if (filter === "pending" && member.approved) return false;
    if (filter === "approved" && !member.approved) return false;
    if (!q) return true;

    return [member.name, member.email, member.authEmail, member.affiliation, member.phone]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(q));
  });

  searched.sort((a, b) => {
    if (a.approved !== b.approved) return a.approved ? 1 : -1;
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
              가입 회원의 정보를 확인하고 승인 상태를 관리합니다. 관리자 계정은 이 목록에 표시되지 않습니다.
            </p>
          </div>
          <Link href="/admin-x7k3p9/resources" className={secondaryButton}>
            <ArrowLeft className="h-4 w-4" />
            관리자 홈
          </Link>
        </div>
      </section>

      {message ? (
        <div role="status" className="mt-6 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {message}
        </div>
      ) : null}

      <section className="mt-7 grid border border-slate-200 bg-white sm:grid-cols-3">
        <div className="border-b border-slate-200 p-5 sm:border-b-0 sm:border-r">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-slate-500">전체 회원</span>
            <UsersRound className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-3 text-3xl font-semibold tabular-nums text-slate-950">{stats.total}</div>
        </div>
        <div className="border-b border-slate-200 p-5 sm:border-b-0 sm:border-r">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-slate-500">승인 대기</span>
            <Clock3 className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-3 text-3xl font-semibold tabular-nums text-slate-950">{stats.pending}</div>
        </div>
        <div className="p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-slate-500">승인 완료</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-3 text-3xl font-semibold tabular-nums text-slate-950">{stats.approved}</div>
        </div>
      </section>

      <section className="mt-8">
        <div className="flex flex-col gap-4 border-b border-slate-300 pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">회원 목록</h2>
            <p className="mt-1 text-sm text-slate-500">승인 대기 회원이 먼저 표시됩니다.</p>
          </div>

          <form action="/admin-x7k3p9/users" method="get" className="flex flex-col gap-2 sm:flex-row" role="search">
            <div className="relative min-w-0 sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                name="q"
                type="search"
                defaultValue={sp.q ?? ""}
                placeholder="이름, 이메일, 소속 검색"
                aria-label="회원 검색"
                className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-[#2B6CA3] focus:ring-2 focus:ring-[#2B6CA3]/10"
              />
            </div>
            <select
              name="filter"
              defaultValue={filter}
              aria-label="승인 상태 필터"
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-[#2B6CA3]"
            >
              <option value="all">전체 상태</option>
              <option value="pending">승인 대기</option>
              <option value="approved">승인 완료</option>
            </select>
            <button type="submit" className="h-10 rounded-md bg-[#174A7E] px-4 text-sm font-semibold text-white transition hover:bg-[#103A66]">
              적용
            </button>
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
                <details key={member.id} className={index !== visible.length - 1 ? "border-b border-slate-100" : ""}>
                  <summary className="grid cursor-pointer list-none gap-4 px-5 py-5 transition hover:bg-slate-50 lg:grid-cols-[minmax(220px,1.3fr)_minmax(220px,1fr)_150px_120px] lg:items-center [&::-webkit-details-marker]:hidden">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="truncate text-[15px] font-semibold text-slate-950">{member.name || "이름 미등록"}</strong>
                        <span className={`border px-2 py-0.5 text-[11px] font-bold ${member.approved ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                          {member.approved ? "승인 완료" : "승인 대기"}
                        </span>
                        {!member.emailConfirmed ? (
                          <span className="border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-500">이메일 미확인</span>
                        ) : null}
                      </div>
                      <p className="mt-1.5 truncate text-sm text-slate-500">{member.affiliation || "소속 미등록"}</p>
                    </div>

                    <div className="min-w-0 text-sm text-slate-600">
                      <div className="flex min-w-0 items-center gap-2">
                        <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">{email}</span>
                      </div>
                      <div className="mt-1.5 text-xs text-slate-400">{member.phone || "전화번호 없음"}</div>
                    </div>

                    <div className="text-xs leading-5 text-slate-400">
                      <div className="font-semibold text-slate-500">가입</div>
                      <div className="mt-0.5 tabular-nums">{formatDateTime(joinedAt)}</div>
                    </div>

                    <div className="lg:text-right">
                      <span className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700">
                        상세 관리
                      </span>
                    </div>
                  </summary>

                  <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-5">
                    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">Name</div>
                        <div className="mt-1.5 text-sm font-semibold text-slate-800">{member.name || "미등록"}</div>
                      </div>
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">Affiliation</div>
                        <div className="mt-1.5 text-sm text-slate-700">{member.affiliation || "미등록"}</div>
                      </div>
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">Phone</div>
                        <div className="mt-1.5 text-sm text-slate-700">{member.phone || "미등록"}</div>
                      </div>
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">Last sign in</div>
                        <div className="mt-1.5 text-sm tabular-nums text-slate-700">{formatDateTime(member.lastSignInAt)}</div>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-col justify-between gap-4 border-t border-slate-200 pt-5 md:flex-row md:items-end">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                          <ShieldCheck className="h-4 w-4 text-[#174A7E]" />
                          이용 승인 관리
                        </div>
                        <p className="mt-1 text-xs leading-5 text-slate-400">승인된 회원만 회원 전용 자료를 이용할 수 있습니다.</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {member.approved ? (
                          <form action={revokeMemberApprovalAction}>
                            <input type="hidden" name="id" value={member.id} />
                            <button type="submit" className="h-9 rounded-md border border-amber-300 bg-white px-3 text-sm font-semibold text-amber-700 transition hover:bg-amber-50">
                              승인 취소
                            </button>
                          </form>
                        ) : (
                          <form action={approveMemberAction}>
                            <input type="hidden" name="id" value={member.id} />
                            <button type="submit" className="h-9 rounded-md bg-[#174A7E] px-3 text-sm font-semibold text-white transition hover:bg-[#103A66]">
                              회원 승인
                            </button>
                          </form>
                        )}
                      </div>
                    </div>

                    <details className="mt-5 border-t border-slate-200 pt-5">
                      <summary className="inline-flex cursor-pointer select-none items-center gap-2 text-sm font-semibold text-red-700 [&::-webkit-details-marker]:hidden">
                        <Trash2 className="h-4 w-4" />
                        회원 삭제
                      </summary>
                      <div className="mt-3 max-w-xl border border-red-200 bg-red-50 px-4 py-3">
                        <p className="text-sm font-semibold text-red-800">삭제하면 이 회원의 로그인 계정도 함께 삭제됩니다.</p>
                        <p className="mt-1 text-xs leading-5 text-red-700">복구 기능이 없으므로 탈퇴 요청이나 잘못 생성된 계정인 경우에만 사용하세요.</p>
                        <form action={deleteMemberAction} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <input type="hidden" name="id" value={member.id} />
                          <label className="flex items-center gap-2 text-xs font-semibold text-red-800">
                            <input type="checkbox" name="confirm_delete" required className="h-4 w-4 accent-red-700" />
                            이 회원을 삭제하는 것을 확인합니다.
                          </label>
                          <button type="submit" className="h-9 shrink-0 rounded-md border border-red-300 bg-white px-3 text-sm font-semibold text-red-700 transition hover:bg-red-100">
                            계정 삭제
                          </button>
                        </form>
                      </div>
                    </details>
                  </div>
                </details>
              );
            })}
          </div>
        )}

        {pageCount > 1 ? (
          <nav className="mt-6 flex items-center justify-center gap-2" aria-label="회원 목록 페이지">
            <Link
              href={pageHref(sp.q ?? "", filter, Math.max(1, page - 1))}
              aria-disabled={page === 1}
              className={`inline-flex h-9 items-center gap-1 rounded-md border border-slate-300 px-3 text-sm font-semibold ${page === 1 ? "pointer-events-none text-slate-300" : "text-slate-700 hover:bg-slate-50"}`}
            >
              <ChevronLeft className="h-4 w-4" /> 이전
            </Link>
            <span className="px-3 text-sm tabular-nums text-slate-500">{page} / {pageCount}</span>
            <Link
              href={pageHref(sp.q ?? "", filter, Math.min(pageCount, page + 1))}
              aria-disabled={page === pageCount}
              className={`inline-flex h-9 items-center gap-1 rounded-md border border-slate-300 px-3 text-sm font-semibold ${page === pageCount ? "pointer-events-none text-slate-300" : "text-slate-700 hover:bg-slate-50"}`}
            >
              다음 <ChevronRight className="h-4 w-4" />
            </Link>
          </nav>
        ) : null}
      </section>
    </main>
  );
}
