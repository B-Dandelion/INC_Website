"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { trackSiteEvent } from "@/lib/siteAnalyticsClient";
import type { Locale } from "@/lib/i18n";

const supabase = supabaseBrowser();

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export default function SignupClient({ locale = "ko" }: { locale?: Locale }) {
  const router = useRouter();
  const sp = useSearchParams();
  const en = locale === "en";
  const next = safeNextPath(sp.get("next"));

  const [name, setName] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const canSubmit = useMemo(() => {
    if (!name.trim() || !affiliation.trim() || !phone.trim()) return false;
    if (!email.trim() || !isValidEmail(email)) return false;
    if (!pw || pw.length < 8) return false;
    return pw === pw2;
  }, [name, affiliation, phone, email, pw, pw2]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) {
      setMsg(en ? "Check all required fields. Passwords must be at least 8 characters." : "필수 항목을 확인해 주세요. 비밀번호는 8자 이상이어야 합니다.");
      return;
    }

    setLoading(true);
    setMsg("");

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: pw,
        options: {
          data: {
            name: name.trim(),
            phone: phone.trim(),
            affiliation: affiliation.trim(),
          },
        },
      });

      if (error) {
        const text = error.message.toLowerCase();
        if (text.includes("already registered")) {
          setMsg(en ? "An account with this email already exists." : "이미 가입된 이메일입니다.");
        } else {
          setMsg(en ? "We couldn't complete your registration. Please check your information and try again." : "회원가입을 완료하지 못했습니다. 입력 정보를 확인한 뒤 다시 시도해 주세요.");
        }
        return;
      }

      trackSiteEvent("signup", { path: "/auth/signup" });

      if (data.session) {
        setMsg(en ? "Registration completed. Your account is awaiting approval." : "회원가입이 완료되었습니다. 현재 승인 대기 상태입니다.");
        router.push("/pending");
        router.refresh();
      } else {
        setMsg(en ? "Registration request received. Confirm your email before logging in. Your account will remain pending until approved." : "회원가입 요청이 완료되었습니다. 이메일 확인 후 로그인해 주세요. 관리자 승인 전까지 승인 대기 상태입니다.");
      }
    } catch {
      setMsg(en ? "An error occurred during registration. Please try again shortly." : "회원가입 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "mt-1.5 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#2B6CA3] focus:ring-2 focus:ring-[#2B6CA3]/10";
  const labelClass = "text-sm font-semibold text-slate-700";
  const helperClass = "mt-1.5 text-xs leading-5 text-slate-400";

  return (
    <main className="min-h-[calc(100vh-72px)] bg-[#F6F7F9] px-5 py-12 md:py-16">
      <div className="mx-auto w-full max-w-lg">
        <div className="border border-slate-200 bg-white p-6 md:p-8">
          <div className="flex justify-center"><Image src="/inc_logo.png" alt="INC" width={148} height={56} priority /></div>

          <div className="mt-7 border-b border-slate-200 pb-5 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#2B6CA3]">Member Registration</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{en ? "Create an account" : "회원가입"}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">{en ? "Accounts require approval before member-only resources become available." : "가입 후 관리자 승인이 완료되면 회원 전용 자료를 이용할 수 있습니다."}</p>
          </div>

          <form onSubmit={onSubmit} className="mt-6 grid gap-4">
            <label className={labelClass}>{en ? "Name" : "이름"} <span className="text-[#174A7E]">*</span><input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder={en ? "Name" : "홍길동"} required /></label>
            <label className={labelClass}>{en ? "Affiliation" : "소속 기관"} <span className="text-[#174A7E]">*</span><input value={affiliation} onChange={(e) => setAffiliation(e.target.value)} className={inputClass} placeholder={en ? "Organization / Institution" : "OO기관 / OO대학교"} required /></label>
            <label className={labelClass}>{en ? "Phone" : "전화번호"} <span className="text-[#174A7E]">*</span><input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} placeholder="010-1234-5678" required /><span className={helperClass}>{en ? "Enter a number where you can be reached." : "실제 연락 가능한 번호를 입력해 주세요."}</span></label>
            <label className={labelClass}>{en ? "Email" : "이메일"} <span className="text-[#174A7E]">*</span><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="name@example.com" required /></label>
            <label className={labelClass}>{en ? "Password" : "비밀번호"} <span className="text-[#174A7E]">*</span><input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} className={inputClass} placeholder={en ? "At least 8 characters" : "8자 이상"} required /><span className={helperClass}>{en ? "Use at least 8 characters." : "8자 이상 입력해 주세요."}</span></label>
            <label className={labelClass}>{en ? "Confirm password" : "비밀번호 확인"} <span className="text-[#174A7E]">*</span><input type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} className={inputClass} required />{pw2 && pw !== pw2 ? <span className="mt-1.5 text-xs text-red-600">{en ? "Passwords do not match." : "비밀번호가 일치하지 않습니다."}</span> : null}</label>

            {msg ? <div role="status" className="border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm leading-6 text-slate-700">{msg}</div> : null}

            <button type="submit" disabled={!canSubmit || loading} className="mt-1 h-11 rounded-md bg-[#174A7E] px-5 text-sm font-bold text-white transition hover:bg-[#103A66] disabled:cursor-not-allowed disabled:opacity-50">{loading ? (en ? "Submitting..." : "처리 중...") : en ? "Sign up" : "회원가입"}</button>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm">
              <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-[#174A7E] hover:underline">{en ? "Already have an account? Log in" : "이미 계정이 있나요? 로그인"}</Link>
              <Link href={next} className="text-slate-500 transition hover:text-[#174A7E]">{en ? "Back" : "돌아가기"}</Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
