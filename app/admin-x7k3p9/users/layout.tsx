import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminCookie, verifyAdminCookieValue } from "@/lib/adminSession";

export default async function AdminUsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jar = await cookies();
  const value = jar.get(adminCookie.name)?.value;

  if (!verifyAdminCookieValue(value)) {
    redirect("/admin-x7k3p9?reason=session");
  }

  return children;
}
