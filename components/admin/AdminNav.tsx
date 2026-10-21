"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarDays, FolderOpen, Megaphone, UsersRound } from "lucide-react";
import { cn } from "./ui/cn";

const ITEMS = [
  { href: "/admin-x7k3p9/resources", label: "자료실", icon: FolderOpen },
  { href: "/admin-x7k3p9/notices", label: "공지사항", icon: Megaphone },
  { href: "/admin-x7k3p9/events", label: "이벤트", icon: CalendarDays },
  { href: "/admin-x7k3p9/users", label: "회원", icon: UsersRound },
  { href: "/admin-x7k3p9/analytics", label: "이용 분석", icon: BarChart3 },
] as const;

export default function AdminNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav aria-label="관리 메뉴" className="-mb-px flex gap-1 overflow-x-auto">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-semibold transition",
              active ? "border-[#174A7E] text-[#174A7E]" : "border-transparent text-slate-600 hover:text-slate-900",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
