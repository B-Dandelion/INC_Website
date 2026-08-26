"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole } from "lucide-react";

export default function AdminGate() {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSessionExpired(params.get("reason") === "session");
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!pw) {
      setErr("비밀번호를 입력하세요.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });

      const out = await res.json().catch(() => null);

      if (!res.ok) {
        setErr(
          out?.error ??
            (res.status === 401
              ? "비밀번호가 올바르지 않습니다."
              : `로그인 처리에 실패했습니다. (HTTP ${res.status})`),
        );
        return;
      }

      router.replace("/admin-x7k3p9/resources");
      router.refresh();
    } catch {
      setErr("서버에 연결하지 못했습니다. 잠시 후 다시 시도하세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[620px] max-w-7xl items-start justify-center px-5 py-16 md:px-6 md:py-24">
      <section className="w-full max-w-[430px] border border-slate-200 bg-white p-7 shadow-[0_14px_40px_rgba(15,23,42,0.06)] md:p-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#EEF4FA] text-[#174A7E]">
          <LockKeyhole className="h-5 w-5" />
        </div>

        <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.16em] text-[#2B6CA3]">INC Administration</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-slate-950">관리자 로그인</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">관리자 비밀번호를 입력해 관리 화면으로 이동하세요.</p>

        {sessionExpired ? (
          <div className="mt-5 border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm leading-5 text-amber-800">
            관리자 세션이 만료되었습니다. 다시 로그인해 주세요.
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="mt-7 grid gap-3">
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            비밀번호
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              className="h-11 rounded-md border border-slate-300 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-[#2B6CA3] focus:ring-2 focus:ring-[#2B6CA3]/10"
            />
          </label>

          <button
            type="submit"
            disabled={loading || !pw}
            className="mt-2 inline-flex h-11 items-center justify-center rounded-md border border-[#174A7E] bg-[#174A7E] px-4 text-sm font-semibold text-white transition hover:bg-[#103A66] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {loading ? "확인 중..." : "관리자 화면 입장"}
          </button>

          {err ? <div className="mt-1 text-sm font-medium text-red-700">{err}</div> : null}
        </form>
      </section>
    </main>
  );
}
