// app/api/admin/resources/update/route.ts
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
    return NextResponse.json({ ok: false, error: "missing auth token" }, { status: 401 });
  }

  // 1) 토큰 검증 (anon key로 충분)
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

  // 2) admin + approved 확인 (service role)
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

  // 3) 입력
  const body = await req.json().catch(() => ({}));
  const resourceId = Number(body?.resourceId);
  const displayRaw = body?.displayname; // string | null | undefined

  if (!Number.isFinite(resourceId) || resourceId <= 0) {
    return NextResponse.json({ ok: false, error: "invalid resourceId" }, { status: 400 });
  }

  // displayname: string | null 허용
  const display =
    typeof displayRaw === "string" ? displayRaw.trim() : "";

  const displayOrNull = display.length ? display : null;

  // 4) 업데이트
  const { data: updated, error: upErr } = await supabaseAdmin
    .from("resources")
    .update({
      displayname: displayOrNull,
      updated_at: new Date().toISOString(),
    })
    .eq("id", resourceId)
    .select("id, title, displayname, updated_at")
    .maybeSingle();

  if (upErr) {
    return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, resource: updated });
}