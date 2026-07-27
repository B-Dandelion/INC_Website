import { NextResponse } from "next/server";
import { adminCookie } from "@/lib/adminSession";

export async function POST(req: Request) {
  const res = NextResponse.redirect(new URL("/admin-x7k3p9", req.url), 303);

  res.cookies.set(adminCookie.name, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return res;
}
