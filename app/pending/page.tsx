export default function PendingPage() {
  return (
    <main className="min-h-[calc(100vh-120px)] bg-gradient-to-b from-blue-50 to-white px-4 py-12">
      <div className="mx-auto w-full max-w-xl rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-2xl font-semibold text-slate-900">승인 대기</h1>
        <p className="mt-2 text-slate-600 leading-relaxed">
          회원가입은 완료되었습니다. 현재 계정은 승인 대기 상태입니다.
          <br />
          관리자가 승인하면 멤버 전용 자료를 열람할 수 있습니다.
        </p>
        <p className="mt-6 text-sm text-slate-500">
          * 승인이 완료되면 다시 로그인하거나 페이지를 새로고침하면 반영됩니다.
        </p>
      </div>
    </main>
  );
}