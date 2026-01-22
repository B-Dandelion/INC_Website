"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default function LoginClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const nextPath = sp.get("next") || "/";
  const signupHref = `/auth/signup?next=${encodeURIComponent(nextPath)}`;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;

    if (uid) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("approved")
        .eq("id", uid)
        .single();

      if (!profile?.approved) {
        router.replace("/pending");
        return;
      }
    }

    localStorage.setItem("inc_login_at", String(Date.now()));
    localStorage.setItem("inc_last_at", String(Date.now()));

    router.replace(nextPath);
    router.refresh();
  }

  return (
    <main className="min-h-[calc(100vh-120px)] bg-gradient-to-b from-blue-50 to-white px-4 py-12">
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="px-8 pt-8 pb-6">
            <div className="flex items-center justify-center">
              <Image src="/inc_logo.png" alt="INC" width={150} height={56} priority />
            </div>

            <h1 className="mt-6 text-center text-xl font-extrabold text-gray-900">로그인</h1>
            <p className="mt-2 text-center text-sm text-gray-600">
              승인된 계정만 자료 업로드 및 비공개 자료 접근이 가능합니다.
            </p>

            <form onSubmit={onSubmit} className="mt-6 grid gap-4">
              <label className="grid gap-1">
                <span className="text-sm font-medium text-gray-700">Email</span>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 rounded-xl border border-gray-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  required
                />
              </label>

              <label className="grid gap-1">
                <span className="text-sm font-medium text-gray-700">Password</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 rounded-xl border border-gray-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  required
                />
              </label>

              {errorMsg && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-1 h-11 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>

              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-slate-600">계정이 없으신가요?</span>
                <Link href={signupHref} className="font-semibold text-blue-600 hover:text-blue-700">
                  회원가입
                </Link>
              </div>

              <div className="mt-2 flex items-center justify-between text-sm text-gray-600">
                <Link href={nextPath} className="hover:text-blue-600">
                  돌아가기
                </Link>
              </div>
            </form>
          </div>

          <div className="rounded-b-2xl border-t border-gray-200 bg-gray-50 px-8 py-4 text-xs text-gray-600">
            관리자 계정으로 로그인하면 상단 메뉴에서 관리자 기능(예: 업로드)로 이동할 수 있게 확장 가능합니다.
          </div>
        </div>
      </div>
    </main>
  );
}