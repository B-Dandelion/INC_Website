import Link from "next/link";
import type { ReactNode } from "react";
import { ExternalLink, LogOut } from "lucide-react";
import AdminNav from "./AdminNav";
import { ConfirmProvider } from "./ui/ConfirmDialog";
import { ToastProvider } from "./ui/Toast";
import { buttonClass } from "./ui/Button";

// One frame for every admin page: brand, section tabs, site link, logout.
export default function AdminShell({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <div className="min-h-screen bg-[#F6F7F9]">
          <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 pt-3 md:px-6">
              <Link href="/admin-x7k3p9/resources" className="text-sm font-bold tracking-[-0.01em] text-slate-950">
                INC <span className="font-semibold text-[#2B6CA3]">관리자</span>
              </Link>
              <div className="flex items-center gap-2">
                <Link href="/" target="_blank" rel="noopener noreferrer" className={buttonClass("ghost", "sm")}>
                  사이트 보기
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
                <form action="/api/admin/logout" method="post">
                  <button type="submit" className={buttonClass("secondary", "sm")}>
                    <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                    로그아웃
                  </button>
                </form>
              </div>
            </div>
            <div className="mx-auto max-w-7xl px-5 md:px-6">
              <AdminNav />
            </div>
          </header>
          {children}
        </div>
      </ConfirmProvider>
    </ToastProvider>
  );
}
