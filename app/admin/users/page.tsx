"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { useMe } from "@/app/hooks/useMe";

type Row = {
  id: string;
  email: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
  role: "member" | "admin";
  approved: boolean;
};

const supabase = supabaseBrowser();

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { me, loading: meLoading, isAdmin } = useMe();

  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>("");

  const inflight = useRef<AbortController | null>(null);

  // 접근 제어 (loading 중엔 절대 튕기지 말 것)
  useEffect(() => {
    if (meLoading) return;

    if (!me?.isLoggedIn) {
      router.replace("/auth/login?next=%2Fadmin%2Fusers");
      return;
    }
    if (!isAdmin) {
      router.replace("/");
      return;
    }
  }, [meLoading, me?.isLoggedIn, isAdmin, router]);

  async function load() {
    inflight.current?.abort();
    const ac = new AbortController();
    inflight.current = ac;

    setBusy(true);
    setErr("");

    try {
      const token = await getToken();
      if (!token) {
        setErr("로그인 토큰이 없습니다.");
        return;
      }

      const qs = new URLSearchParams();
      if (q.trim()) qs.set("q", q.trim());
      qs.set("perPage", "80");

      const res = await fetch(`/api/admin/users/list?${qs.toString()}`, {
        method: "GET",
        cache: "no-store",
        signal: ac.signal,
        headers: { Authorization: `Bearer ${token}` },
      });

      const out = await res.json().catch(() => ({}));

      if (ac.signal.aborted) return;

      if (!res.ok || !out?.ok) {
        // 401/403이면 튕기지 말고 이유를 보여줘 (디버깅 편하게)
        setErr(out?.error || `failed: ${res.status}`);
        return;
      }

      setRows(out.users || []);
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      setErr(e?.message || "unknown error");
    } finally {
      if (inflight.current === ac) {
        inflight.current = null;
        setBusy(false);
      }
    }
  }

  async function saveRow(r: Row, patch: Partial<Pick<Row, "role" | "approved">>) {
    setBusy(true);
    setErr("");

    try {
      const token = await getToken();
      if (!token) {
        setErr("로그인 토큰이 없습니다.");
        return;
      }

      const res = await fetch("/api/admin/users/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: r.id, ...patch }),
      });

      const out = await res.json().catch(() => ({}));
      if (!res.ok || !out?.ok) {
        setErr(out?.error || `update failed: ${res.status}`);
        return;
      }

      setRows((prev) =>
        prev.map((x) =>
          x.id === r.id ? { ...x, ...patch } as Row : x,
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  // 최초 로드
  useEffect(() => {
    if (meLoading) return;
    if (!isAdmin) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meLoading, isAdmin]);

  if (meLoading) return <main className="p-6">loading...</main>;
  if (!me?.isLoggedIn) return <main className="p-6">redirecting...</main>;
  if (!isAdmin) return <main className="p-6">forbidden</main>;

  return (
    <main className="min-h-[calc(100vh-120px)] bg-slate-50 px-4 py-8">
      <div className="mx-auto w-full max-w-5xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">사용자 권한 관리</h1>
            <p className="mt-1 text-sm text-slate-600">
              profiles.role / profiles.approved 관리
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="email 검색"
              className="w-64 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              onClick={load}
              disabled={busy}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? "..." : "새로고침"}
            </button>
          </div>
        </div>

        {err ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        ) : null}

        <div className="mt-5 overflow-hidden rounded-2xl ring-1 ring-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-left">Role</th>
                <th className="px-3 py-2 text-left">Approved</th>
                <th className="px-3 py-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{r.email ?? "(no email)"}</td>

                  <td className="px-3 py-2">
                    <select
                      value={r.role}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x) => (x.id === r.id ? { ...x, role: e.target.value as any } : x)),
                        )
                      }
                      className="rounded-lg border border-slate-200 px-2 py-1"
                    >
                      <option value="member">member</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>

                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={r.approved}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x) => (x.id === r.id ? { ...x, approved: e.target.checked } : x)),
                        )
                      }
                    />
                  </td>

                  <td className="px-3 py-2">
                    <button
                      disabled={busy}
                      onClick={() => saveRow(r, { role: r.role, approved: r.approved })}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50"
                    >
                      저장
                    </button>
                  </td>
                </tr>
              ))}

              {rows.length === 0 ? (
                <tr>
                  <td className="px-3 py-8 text-center text-slate-500" colSpan={4}>
                    {busy ? "불러오는 중..." : "데이터 없음"}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
