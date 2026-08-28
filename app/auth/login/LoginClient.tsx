"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { trackSiteEvent } from "@/lib/siteAnalyticsClient";
import type { Locale } from "@/lib/i18n";

const supabase = supabaseBrowser();

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

function loginErrorMessage(message: string | undefined, en: boolean) {
  const value = (message ?? "").toLowerCase();
  if (value.includes("invalid login credentials")) return en ? "Check your email address and password." : "이메일 또는 비밀번호를 확인해 주세요.";
  if (value.includes("email not confirmed")) return en ? "Confirm your email address before logging in." : "이메일 인증을 완료한 후 로그인해 주세요.";
  return en ? "An error occurred while logging in. Please try again shortly." : "로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
}

export default function LoginClient({ locale = "ko" }: { locale?: Locale }) {
  const router = useRouter();
  const sp = useSearchParams();
  const en = locale === "en";

  const nextPath = safeNextPath(sp.get("next"));
  const signupHref = `/auth/signup?next=${encodeURIComponent(nextPath)}`;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });

      if (error) {
        setErrorMsg(loginErrorMessage(error.message, en));
        return;
      }

      trackSiteEvent("login", { path: "/login" });

      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;

      if (uid) {
        const { data: profile } = await supabase.from("profiles").select("approved").eq("id", uid).single();
        if (!profile?.approved) {
          router.replace("/pending");
          return;
        }
      }

      localStorage.setItem("inc_login_at", String(Date.now()));
      localStorage.setItem("inc_last_at", String(Date.now()));
      router.replace(nextPath);
      router.refresh();
    } catch {
      setErrorMsg(loginErrorMessage(undefined, en));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-72px)] bg-[#F6F7F9] px-5 py-12 md:py-16">
      <div className="mx-auto w-full max-w-md">
        <div className="border border-slate-200 bg-white p-6 md:p-8">
          <div className="flex justify-center"><Image src="/inc_logo.png" alt="INC" width={148} height={56} priority /></div>

          <div className="mt-7 border-b border-slate-200 pb-5 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#2B6CA3]">Member Login</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{en ? "Log in" : "로그인"}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">{en ? "Approved accounts can access member-only resources." : "승인된 계정은 회원 전용 자료를 이용할 수 있습니다."}</p>
          </div>

          <form onSubmit={onSubmit} className="mt-6 grid gap-4">
            <label className="grid gap-1.5">
              <span className="text-sm font-semibold text-slate-700">{en ? "Email" : "이메일"}</span>
              <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 rounded-md border border-slate-300 px-3 text-sm text-slate-900 outline-none transition focus:border-[#2B6CA3] focus:ring-2 focus:ring-[#2B6CA3]/10" required />
            </label>

            <label className="grid gap-1.5">
              <span className="text-sm font-semibold text-slate-700">{en ? "Password" : "비밀번호"}</span>
              <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 rounded-md border border-slate-300 px-3 text-sm text-slate-900 outline-none transition focus:border-[#2B6CA3] focus:ring-2 focus:ring-[#2B6CA3]/10" required />
            </label>

            {errorMsg ? <div role="alert" className="border border-red-200 bg-red-50 px-3 py-2.5 text-sm leading-6 text-red-700">{errorMsg}</div> : null}

            <button type="submit" disabled={loading} className="mt-1 h-11 rounded-md bg-[#174A7E] text-sm font-bold text-white transition hover:bg-[#103A66] disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? (en ? "Logging in..." : "로그인 중...") : en ? "Log in" : "로그인"}
            </button>

            <div className="mt-2 flex items-center justify-between gap-4 border-t border-slate-100 pt-4 text-sm">
              <span className="text-slate-500">{en ? "Don't have an account?" : "계정이 없으신가요?"}</span>
              <Link href={signupHref} className="font-semibold text-[#174A7E] hover:underline">{en ? "Sign up" : "회원가입"}</Link>
            </div>

            <Link href={nextPath} className="text-center text-sm font-medium text-slate-500 transition hover:text-[#174A7E]">← {en ? "Back" : "이전 페이지로 돌아가기"}</Link>
          </form>
        </div>
      </div>
    </main>
  );
}
