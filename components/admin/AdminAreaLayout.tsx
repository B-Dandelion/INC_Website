import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { hasAdminSession } from "@/lib/requireAdmin";
import AdminShell from "./AdminShell";

// Shared layout for every signed-in admin area (resources, notices, events,
// users, analytics): check the admin cookie once, then render the shell.
export default async function AdminAreaLayout({ children }: { children: ReactNode }) {
  if (!(await hasAdminSession())) redirect("/admin-x7k3p9?reason=session");
  return <AdminShell>{children}</AdminShell>;
}
