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

// For server components and layouts: true when the admin cookie is valid.
export async function hasAdminSession() {
  const jar = await cookies();
  return verifyAdminCookieValue(jar.get(adminCookie.name)?.value);
}
