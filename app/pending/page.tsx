import Link from "next/link";
import { Clock3 } from "lucide-react";

export default function PendingPage() {
  return (
    <main className="min-h-[calc(100vh-72px)] bg-[#F6F7F9] px-5 py-12 md:py-16">
      <div className="mx-auto w-full max-w-xl border border-slate-200 bg-white p-6 md:p-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#EEF4FA] text-[#174A7E]">
          <Clock3 className="h-5 w-5" />
        </div>
        <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.16em] text-[#2B6CA3]">Account Status</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">승인 대기 중입니다</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          회원가입은 완료되었습니다. 관리자가 계정을 확인하고 승인하면 회원 전용 자료를 이용할 수 있습니다.
        </p>
        <div className="mt-6 border-l-2 border-[#174A7E] bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-500">
          승인이 완료된 뒤 다시 로그인하거나 페이지를 새로고침하면 상태가 반영됩니다.
        </div>

        <div className="mt-7 flex flex-wrap gap-2">
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-md bg-[#174A7E] px-4 text-sm font-bold text-white transition hover:bg-[#103A66]"
          >
            홈으로
          </Link>
          <Link
            href="/contact"
            className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            문의하기
          </Link>
        </div>
      </div>
    </main>
  );
}
