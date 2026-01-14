// app/api/me/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function supabaseFromAuthHeader(authHeader: string) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: authHeader } },
  });
}

type Role = "member" | "admin";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") || "";

  // 토큰 없으면: 비로그인으로 처리(200 OK)
  if (!authHeader.startsWith("Bearer ")) {
    return NextResponse.json({
      ok: true,
      isLoggedIn: false,
      approved: false,
      role: "member" as Role,
      user: null,
    });
  }

  // 토큰 검증
  const supabaseAuth = supabaseFromAuthHeader(authHeader);
  const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
  const user = userData?.user ?? null;

  if (userErr || !user) {
    return NextResponse.json({
      ok: true,
      isLoggedIn: false,
      approved: false,
      role: "member" as Role,
      user: null,
      error: "invalid token",
    });
  }

  // profiles에서 role/approved 조회
  const { data: profile, error: profErr } = await supabaseAdmin
    .from("profiles")
    .select("role, approved")
    .eq("id", user.id)
    .maybeSingle<{ role: Role; approved: boolean }>();

  if (profErr || !profile) {
    // 프로필 없으면 회원 취급(관리자 X)
    return NextResponse.json({
      ok: true,
      isLoggedIn: true,
      approved: false,
      role: "member" as Role,
      user: { id: user.id, email: user.email ?? null },
      error: profErr?.message ?? "profile not found",
    });
  }

  return NextResponse.json({
    ok: true,
    isLoggedIn: true,
    approved: profile.approved === true,
    role: (profile.role as Role) || ("member" as Role),
    user: { id: user.id, email: user.email ?? null },
  });
}