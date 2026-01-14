import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function supabaseFromAuthHeader(authHeader: string) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: authHeader } },
  });
}

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ ok: false, error: "missing auth token" }, { status: 401 });
  }

  // 1) 토큰 검증
  const supabaseAuth = supabaseFromAuthHeader(authHeader);
  const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
  const user = userData?.user;
  if (userErr || !user) {
    return NextResponse.json({ ok: false, error: "invalid token" }, { status: 401 });
  }

  // 2) admin + approved 확인
  const { data: profile, error: profErr } = await supabaseAdmin
    .from("profiles")
    .select("role, approved")
    .eq("id", user.id)
    .single();

  if (profErr || !profile || profile.role !== "admin" || profile.approved !== true) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  // 3) 입력
  const body = await req.json().catch(() => ({}));
  const resourceId = Number(body?.resourceId);

  // displayname: string | null 허용
  const raw = body?.displayname;
  const displayname =
    raw === null || raw === undefined ? null : String(raw).trim();
  const displaynameOrNull = displayname && displayname.length ? displayname : null;

  if (!Number.isFinite(resourceId) || resourceId <= 0) {
    return NextResponse.json({ ok: false, error: "invalid resourceId" }, { status: 400 });
  }

  // 4) 업데이트 (파일/R2키/title 등은 건드리지 않음)
  const { data: updated, error: upErr } = await supabaseAdmin
    .from("resources")
    .update({
      displayname: displaynameOrNull,
      updated_at: new Date().toISOString(),
    })
    .eq("id", resourceId)
    .select("id, title, displayname, updated_at")
    .single();

  if (upErr) {
    return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, resource: updated });
}