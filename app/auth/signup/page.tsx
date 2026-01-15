"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export default function SignupPage() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const next = sp.get("next") || "/";

  const [name, setName] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");

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
      setMsg("필수 항목을 확인해 주세요. (비밀번호는 8자 이상)");
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
        setMsg(error.message);
        return;
      }

      // 이메일 인증 ON이면 session이 없을 수 있음.
      // 하지만 우리는 트리거(handle_new_user)가 metadata를 profiles로 복사하므로 여기서 별도 DB 업데이트가 필요 없음.
      if (data.session) {
        setMsg("회원가입 완료. 승인 대기 상태입니다.");
        // 바로 로그인된 상태라면 원하면 next로 이동 가능
        router.push(next);
        router.refresh();
      } else {
        setMsg("회원가입 요청 완료. 이메일 확인 후 로그인해 주세요. (승인 대기)");
      }
    } catch (err: any) {
      setMsg(err?.message || "회원가입 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400";
  const labelClass = "text-sm font-medium text-slate-700";
  const helperClass = "mt-1 text-xs text-slate-500";

  return (
    <main className="min-h-[calc(100vh-120px)] bg-gradient-to-b from-blue-50 to-white px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center gap-3">
            <Image src="/inc_logo.png" alt="INC" width={120} height={40} priority />
            <div>
              <h1 className="text-xl font-semibold text-slate-900">회원가입</h1>
              <p className="text-sm text-slate-600">
                가입 후 승인된 계정만 비공개 자료 접근 및 업로드가 가능합니다.
              </p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="mt-6 grid gap-4">
            <div>
              <label className={labelClass}>
                이름 <span className="text-blue-600">*</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                  placeholder="홍길동"
                  required
                />
              </label>
            </div>

            <div>
              <label className={labelClass}>
                소속 기관 <span className="text-blue-600">*</span>
                <input
                  value={affiliation}
                  onChange={(e) => setAffiliation(e.target.value)}
                  className={inputClass}
                  placeholder="OO대학교 / OO기관"
                  required
                />
              </label>
            </div>

            <div>
              <label className={labelClass}>
                전화번호 <span className="text-blue-600">*</span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass}
                  placeholder="010-1234-5678"
                  required
                />
              </label>
              <p className={helperClass}>형식은 자유지만 실제 연락 가능한 번호를 권장합니다.</p>
            </div>

            <div>
              <label className={labelClass}>
                이메일 <span className="text-blue-600">*</span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="name@example.com"
                  required
                />
              </label>
            </div>

            <div>
              <label className={labelClass}>
                비밀번호 <span className="text-blue-600">*</span>
                <input
                  type="password"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  className={inputClass}
                  placeholder="8자 이상"
                  required
                />
              </label>
            </div>

            <div>
              <label className={labelClass}>
                비밀번호 확인 <span className="text-blue-600">*</span>
                <input
                  type="password"
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                  className={inputClass}
                  required
                />
              </label>
              {pw2 && pw !== pw2 ? (
                <p className="mt-1 text-xs text-red-600">비밀번호가 일치하지 않습니다.</p>
              ) : null}
            </div>

            {msg ? (
              <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200">
                {msg}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={!canSubmit || loading}
              className="mt-1 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50"
            >
              {loading ? "처리 중..." : "회원가입"}
            </button>

            <div className="flex items-center justify-between text-sm text-slate-600">
              <Link href={`/login?next=${encodeURIComponent(next)}`} className="hover:underline">
                이미 계정이 있나요? 로그인
              </Link>
              <Link href={next} className="hover:underline">
                돌아가기
              </Link>
            </div>
          </form>
        </div>

        <div className="mt-6 text-xs text-slate-500">
          * 가입 후 계정은 기본적으로 승인 대기 상태(approved=false)입니다.
        </div>
      </div>
    </main>
  );
}