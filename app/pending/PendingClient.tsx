"use client";

import Link from "next/link";
import { Ban, Clock3 } from "lucide-react";
import { useMe } from "@/app/hooks/useMe";
import type { Locale } from "@/lib/i18n";

export default function PendingClient({ locale }: { locale: Locale }) {
  const { me, loading } = useMe();
  const en = locale === "en";
  const rejected = me?.reviewStatus === "rejected";

  return (
    <main className="min-h-[calc(100vh-72px)] bg-[#F6F7F9] px-5 py-12 md:py-16">
      <div className="mx-auto w-full max-w-xl border border-slate-200 bg-white p-6 md:p-8">
        <div className={`flex h-10 w-10 items-center justify-center rounded-md ${rejected ? "bg-red-50 text-red-700" : "bg-[#EEF4FA] text-[#174A7E]"}`}>
          {rejected ? <Ban className="h-5 w-5" /> : <Clock3 className="h-5 w-5" />}
        </div>
        <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.16em] text-[#2B6CA3]">Account Status</p>

        {loading ? (
          <>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{en ? "Checking account status" : "계정 상태를 확인 중입니다"}</h1>
            <p className="mt-4 text-sm leading-7 text-slate-600">{en ? "Please wait a moment." : "잠시만 기다려 주세요."}</p>
          </>
        ) : rejected ? (
          <>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{en ? "Registration was not approved" : "회원 가입이 승인되지 않았습니다"}</h1>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              {en ? "Your membership request was reviewed but could not be approved. Member-only resources are not available for this account." : "회원 가입 요청을 검토한 결과 승인이 완료되지 않았습니다. 현재 계정으로는 회원 전용 자료를 이용할 수 없습니다."}
            </p>
            {me?.rejectionReason ? (
              <div className="mt-6 border-l-2 border-red-300 bg-red-50 px-4 py-3">
                <div className="text-xs font-bold text-red-700">{en ? "Reason" : "승인 거부 사유"}</div>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{me.rejectionReason}</p>
              </div>
            ) : null}
            <div className="mt-6 border-l-2 border-slate-300 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-500">
              {en ? "If you believe this needs to be reviewed again, please contact INC." : "재검토가 필요하거나 문의사항이 있다면 INC로 문의해 주세요."}
            </div>
          </>
        ) : (
          <>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{en ? "Approval pending" : "승인 대기 중입니다"}</h1>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              {en ? "Your registration is complete. Member-only resources will become available after an administrator reviews and approves your account." : "회원가입은 완료되었습니다. 관리자가 계정을 확인하고 승인하면 회원 전용 자료를 이용할 수 있습니다."}
            </p>
            <div className="mt-6 border-l-2 border-[#174A7E] bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-500">
              {en ? "After approval, log in again or refresh the page to update your account status." : "승인이 완료된 뒤 다시 로그인하거나 페이지를 새로고침하면 상태가 반영됩니다."}
            </div>
          </>
        )}

        <div className="mt-7 flex flex-wrap gap-2">
          <Link href="/" className="inline-flex h-10 items-center justify-center rounded-md bg-[#174A7E] px-4 text-sm font-bold text-white transition hover:bg-[#103A66]">{en ? "Home" : "홈으로"}</Link>
          <Link href="/contact" className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">{en ? "Contact us" : "문의하기"}</Link>
        </div>
      </div>
    </main>
  );
}
