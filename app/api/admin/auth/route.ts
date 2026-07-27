import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { adminCookie, makeAdminCookieValue } from "@/lib/adminSession";

export const runtime = "nodejs";

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const { password } = (await req.json().catch(() => ({}))) as {
    password?: string;
  };

  const expected = process.env.ADMIN_PASSWORD;

  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "관리자 비밀번호 환경변수가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  if (!password || !safeEqual(password, expected)) {
    return NextResponse.json(
      { ok: false, error: "비밀번호가 올바르지 않습니다." },
      { status: 401 }
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(adminCookie.name, makeAdminCookieValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: adminCookie.maxAge,
  });

  return res;
}
