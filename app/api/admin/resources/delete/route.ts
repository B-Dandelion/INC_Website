import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getBearerToken(authHeader: string) {
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  return m?.[1] || null;
}

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const token = getBearerToken(authHeader);

  if (!token) {
    return NextResponse.json({ ok: false, error: "missing token" }, { status: 401 });
  }

  // 1) 토큰으로 유저 확인 (anon key로 충분)
  const supabaseAnon = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: userData, error: userErr } = await supabaseAnon.auth.getUser(token);
  const user = userData?.user;

  if (userErr || !user) {
    return NextResponse.json({ ok: false, error: "invalid token" }, { status: 401 });
  }

  // 2) 관리자 권한 체크 (service role로 profiles 조회)
  const { data: profile, error: profErr } = await supabaseAdmin
    .from("profiles")
    .select("role, approved")
    .eq("id", user.id)
    .maybeSingle();

  if (profErr) {
    return NextResponse.json({ ok: false, error: profErr.message }, { status: 500 });
  }

  if (!profile || profile.role !== "admin" || profile.approved !== true) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  // 3) 입력 검증
  const body = await req.json().catch(() => ({}));
  const resourceId = Number(body?.resourceId);

  if (!Number.isFinite(resourceId)) {
    return NextResponse.json({ ok: false, error: "resourceId required" }, { status: 400 });
  }

  // 4) 삭제 처리 (이미 삭제된 건 idempotent)
  //    - 먼저 존재 확인
  const { data: row, error: rowErr } = await supabaseAdmin
    .from("resources")
    .select("id, deleted_at")
    .eq("id", resourceId)
    .maybeSingle();

  if (rowErr) return NextResponse.json({ ok: false, error: rowErr.message }, { status: 500 });
  if (!row) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  if (row.deleted_at) return NextResponse.json({ ok: true, alreadyDeleted: true });

  //    - 경쟁 조건 줄이려면 조건부 업데이트(선택)
  const { error: updErr } = await supabaseAdmin
    .from("resources")
    .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
    .eq("id", resourceId)
    .is("deleted_at", null);

  if (updErr) return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}