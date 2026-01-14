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
    return NextResponse.json({ ok: false, error: "missing token" }, { status: 401 });
  }

  const supabaseAuth = supabaseFromAuthHeader(authHeader);
  const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
  const user = userData?.user;
  if (userErr || !user) {
    return NextResponse.json({ ok: false, error: "invalid token" }, { status: 401 });
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role, approved")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin" || profile.approved !== true) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const resourceId = Number(body?.resourceId);
  if (!Number.isFinite(resourceId)) {
    return NextResponse.json({ ok: false, error: "resourceId required" }, { status: 400 });
  }

  // 이미 삭제되었는지 확인
  const { data: row, error: rowErr } = await supabaseAdmin
    .from("resources")
    .select("id, deleted_at")
    .eq("id", resourceId)
    .maybeSingle();

  if (rowErr) return NextResponse.json({ ok: false, error: rowErr.message }, { status: 500 });
  if (!row) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  if (row.deleted_at) return NextResponse.json({ ok: true, alreadyDeleted: true });

  const { error: updErr } = await supabaseAdmin
    .from("resources")
    .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
    .eq("id", resourceId);

  if (updErr) return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}