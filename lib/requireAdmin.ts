// lib/requireAdmin.ts
import { cookies } from "next/headers";
import { adminCookie, verifyAdminCookieValue } from "@/lib/adminSession";
import { HttpError } from "@/lib/errors";

export async function requireAdminOrThrow() {
  const jar = await cookies();
  const v = jar.get(adminCookie.name)?.value;
  if (!verifyAdminCookieValue(v)) {
    throw new HttpError(401, "Unauthorized");
  }
}