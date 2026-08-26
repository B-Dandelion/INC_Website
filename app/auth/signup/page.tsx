"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

const supabase = supabaseBrowser();

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

function signupErrorMessage(message?: string) {
  const value = (message ?? "").toLowerCase();
  if (value.includes("already registered") || value.includes("already been registered")) {
    return "이미 가입된 이메일입니다. 로그인해 주세요.";
  }
  if (value.includes("password")) return "비밀번호 조건을 확인해 주세요.";
  return "회원가입 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
}

export default function SignupPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = safeNextPath(sp.get("next"));

  const [name, setName] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [success, setSuccess] = useState(false);

  const canSubmit = useMemo(() => {
    if (!name.trim()) return false;
    if (!affiliation.trim()) return false;
    if (!phone.trim()) return false;
    if (!email.trim() || !isValidEmail(email)) return false;
    if (!pw || pw.length < 8) return false;
    if (pw !== pw2) return false;
    return true;
  }, [name, affiliation, phone, email, pw, pw2]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) {
      setSuccess(false);
      setMsg("필수 항목과 비밀번호 조건을 확인해 주세요.");
      return;
    }

    setLoading(true);
    setMsg("");
    setSuccess(false);

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
        setMsg(signupErrorMessage(error.message));
        return;
      }

      if (data.session) {
        router.push("/pending");
        router.refresh();
      } else {
        setSuccess(true);
        setMsg("회원가입 요청이 완료되었습니다. 이메일 인증 후 로그인해 주세요.");
      }
    } catch {
      setMsg("회원가입 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "mt-1.5 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#2B6CA3] focus:ring-2 focus:ring-[#2B6CA3]/10";
  const labelClass = "text-sm font-semibold text-slate-700";
  const helperClass = "mt-1.5 text-xs leading-5 text-slate-400";

  return (
    <main className="min-h-[calc(100vh-72px)] bg-[#F6F7F9] px-5 py-12 md:py-16">
      <div className="mx-auto w-full max-w-lg">
        <div className="border border-slate-200 bg-white p-6 md:p-8">
          <div className="flex justify-center">
            <Image src="/inc_logo.png" alt="INC" width={148} height={56} priority />
          </div>

          <div className="mt-7 border-b border-slate-200 pb-5 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#2B6CA3]">Member Registration</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">회원가입</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              가입 후 관리자 승인까지 완료된 계정만 회원 전용 자료를 이용할 수 있습니다.
            </p>
          </div>

          <form onSubmit={onSubmit} className="mt-6 grid gap-4">
            <label className={labelClass}>
              이름 <span className="text-[#174A7E]">*</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                autoComplete="name"
                required
              />
            </label>

            <label className={labelClass}>
              소속 기관 <span className="text-[#174A7E]">*</span>
              <input
                value={affiliation}
                onChange={(e) => setAffiliation(e.target.value)}
                className={inputClass}
                placeholder="기관 또는 소속명을 입력하세요"
                required
              />
            </label>

            <div>
              <label className={labelClass}>
                전화번호 <span className="text-[#174A7E]">*</span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass}
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="010-1234-5678"
                  required
                />
              </label>
              <p className={helperClass}>승인 및 계정 확인이 필요한 경우 연락 가능한 번호를 입력해 주세요.</p>
            </div>

            <label className={labelClass}>
              이메일 <span className="text-[#174A7E]">*</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                autoComplete="email"
                placeholder="name@example.com"
                required
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>
                  비밀번호 <span className="text-[#174A7E]">*</span>
                  <input
                    type="password"
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    className={inputClass}
                    autoComplete="new-password"
                    required
                  />
                </label>
                <p className={helperClass}>8자 이상 입력해 주세요.</p>
              </div>

              <div>
                <label className={labelClass}>
                  비밀번호 확인 <span className="text-[#174A7E]">*</span>
                  <input
                    type="password"
                    value={pw2}
                    onChange={(e) => setPw2(e.target.value)}
                    className={inputClass}
                    autoComplete="new-password"
                    required
                  />
                </label>
                {pw2 && pw !== pw2 ? (
                  <p className="mt-1.5 text-xs text-red-600">비밀번호가 일치하지 않습니다.</p>
                ) : null}
              </div>
            </div>

            {msg ? (
              <div
                role="status"
                className={`border px-3 py-2.5 text-sm leading-6 ${
                  success
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {msg}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={!canSubmit || loading}
              className="mt-1 h-11 rounded-md bg-[#174A7E] px-5 text-sm font-bold text-white transition hover:bg-[#103A66] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "처리 중..." : "회원가입"}
            </button>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm">
              <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-[#174A7E] hover:underline">
                이미 계정이 있나요? 로그인
              </Link>
              <Link href={next} className="font-medium text-slate-500 transition hover:text-[#174A7E]">
                ← 돌아가기
              </Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
