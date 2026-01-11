"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default function AdminUploadPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  const [msg, setMsg] = useState("");
  const [json, setJson] = useState<any>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    const run = async () => {
      try {
        setChecking(true);

        const { data, error } = await supabase.auth.getUser();
        if (!alive) return;

        const user = error ? null : data.user;
        if (!user) {
          router.replace("/login?next=%2Fadmin%2Fupload");
          return;
        }

        setEmail(user.email ?? null);

        const { data: profile, error: profErr } = await supabase
          .from("profiles")
          .select("role, approved")
          .eq("id", user.id)
          .single();

        if (!alive) return;

        if (profErr || !profile) {
          router.replace("/");
          return;
        }

        if (profile.role !== "admin" || profile.approved !== true) {
          router.replace("/");
          return;
        }

        setAllowed(true);
      } catch (err: any) {
        if (!alive) return;
        if (err?.name === "AbortError") return;
        router.replace("/");
      } finally {
        if (alive) setChecking(false);
      }
    };

    run();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setEmail(u?.email ?? null);

      // 로그아웃/세션 변경 시 즉시 잠그고 다시 검사
      setAllowed(false);
      setChecking(true);
      run();
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formEl = e.currentTarget;
    if (!(formEl instanceof HTMLFormElement)) {
      setMsg("실패: 폼 요소를 찾을 수 없음");
      return;
    }

    setMsg("업로드 중...");
    setJson(null);

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setMsg("실패: 로그인 필요");
      return;
    }

    const fd = new FormData(formEl);

    const res = await fetch("/api/admin/upload", {
      method: "POST",
      body: fd,
      headers: { Authorization: `Bearer ${token}` },
    });

    const out = await res.json().catch(() => ({}));
    setJson(out);
    setMsg(res.ok ? "성공" : `실패: ${res.status}`);
  }

  const inputClass =
    "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400";
  const labelClass = "text-sm font-medium text-slate-700";
  const selectClass =
    "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400";
  const helperClass = "mt-1 text-xs text-slate-500";

  // 권한 확인 중에는 폼을 보여주지 않음
  if (checking) {
    return (
      <main className="min-h-[calc(100vh-120px)] bg-gradient-to-b from-blue-50 to-white px-4 py-10">
        <div className="mx-auto w-full max-w-3xl">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center gap-3">
              <Image src="/inc_logo.png" alt="INC" width={120} height={40} priority />
              <div>
                <h1 className="text-xl font-semibold text-slate-900">자료 업로드</h1>
                <p className="text-sm text-slate-600">권한 확인 중...</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // allowed가 false면 이미 router.replace로 쫓아냈어야 하는 상태
  if (!allowed) return null;

  return (
    <main className="min-h-[calc(100vh-120px)] bg-gradient-to-b from-blue-50 to-white px-4 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Image src="/inc_logo.png" alt="INC" width={120} height={40} priority />
              <div>
                <h1 className="text-xl font-semibold text-slate-900">자료 업로드</h1>
                <p className="text-sm text-slate-600">
                  R2에 파일을 저장하고, DB(resources)에 메타데이터를 기록합니다.
                </p>
              </div>
            </div>

            <div className="text-right text-sm text-slate-600">
              {email ? (
                <div>
                  <div className="font-medium text-slate-900">{email}</div>
                  <div className="text-xs text-slate-500">관리자 로그인됨</div>
                </div>
              ) : (
                <Link
                  href="/login?next=%2Fadmin%2Fupload"
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50"
                >
                  로그인
                </Link>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <form onSubmit={onSubmit} encType="multipart/form-data" className="md:col-span-2">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>
                    Title
                    <input name="title" required className={inputClass} />
                  </label>
                </div>

                <div>
                  <label className={labelClass}>
                    Board Slug
                    <select name="boardSlug" defaultValue="atm" className={selectClass}>
                      <option value="atm">atm</option>
                      <option value="heartbeat-of-atoms">heartbeat-of-atoms</option>
                    </select>
                  </label>
                </div>

                <div>
                  <label className={labelClass}>
                    Visibility
                    <select name="visibility" defaultValue="public" className={selectClass}>
                      <option value="public">public</option>
                      <option value="member">member</option>
                      <option value="admin">admin</option>
                    </select>
                  </label>
                  <p className={helperClass}>member/admin은 지금은 잠금 표시까지만 권장.</p>
                </div>

                <div>
                  <label className={labelClass}>
                    Kind
                    <select name="kind" defaultValue="pdf" className={selectClass}>
                      <option value="pdf">pdf</option>
                      <option value="image">image</option>
                      <option value="video">video</option>
                      <option value="doc">doc</option>
                      <option value="zip">zip</option>
                      <option value="link">link</option>
                    </select>
                  </label>
                </div>

                <div>
                  <label className={labelClass}>
                    Published At
                    <input name="publishedAt" placeholder="2026-01-08" className={inputClass} />
                  </label>
                  <p className={helperClass}>YYYY-MM-DD 형식</p>
                </div>

                <div>
                  <label className={labelClass}>
                    Note
                    <input name="note" className={inputClass} />
                  </label>
                </div>

                <div className="md:col-span-2">
                  <label className={labelClass}>
                    File
                    <input name="file" type="file" required className={inputClass} />
                  </label>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <div className="text-sm text-slate-700">{msg}</div>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50"
                >
                  Upload
                </button>
              </div>
            </form>

            {json && (
              <div className="md:col-span-2">
                <div className="mt-4 overflow-hidden rounded-2xl ring-1 ring-slate-200">
                  <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-800">
                    Response
                  </div>
                  <pre className="max-h-[420px] overflow-auto bg-zinc-950 p-4 text-xs text-green-400">
                    {JSON.stringify(json, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 text-xs text-slate-500">
          업로드가 성공하면 R2에 저장되고, resources 테이블에 r2_key와 메타데이터가 생성되어야 합니다.
        </div>
      </div>
    </main>
  );
}