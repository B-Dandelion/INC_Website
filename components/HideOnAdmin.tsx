"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

// Admin pages have their own shell, so the public header and footer are hidden there.
export default function HideOnAdmin({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  if (pathname === "/admin-x7k3p9" || pathname.startsWith("/admin-x7k3p9/")) return null;
  return children;
}
