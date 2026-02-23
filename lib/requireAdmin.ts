// lib/requireAdmin.ts
import { cookies } from "next/headers";
import { adminCookie, verifyAdminCookieValue } from "@/lib/adminSession";

export async function requireAdminOrThrow() {
  const jar = await cookies();      
  const v = jar.get(adminCookie.name)?.value;
  if (!verifyAdminCookieValue(v)) {
    const err: any = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }
}