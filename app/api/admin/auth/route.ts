// app/api/admin/auth/route.ts
import { NextResponse } from "next/server";
import { adminCookie, makeAdminCookieValue } from "@/lib/adminSession";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return new NextResponse("Missing ADMIN_PASSWORD", { status: 500 });
  if (!password || password !== expected) return new NextResponse("Unauthorized", { status: 401 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(adminCookie.name, makeAdminCookieValue(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: adminCookie.maxAge,
  });
  return res;
}