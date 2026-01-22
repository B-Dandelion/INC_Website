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

async function requireAdmin(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return { ok: false as const, res: NextResponse.json({ ok: false, error: "missing token" }, { status: 401 }) };
  }

  const supabaseAuth = supabaseFromAuthHeader(authHeader);
  const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
  const user = userData?.user;

  if (userErr || !user) {
    return { ok: false as const, res: NextResponse.json({ ok: false, error: "invalid token" }, { status: 401 }) };
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role, approved")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin" || profile.approved !== true) {
    return { ok: false as const, res: NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }) };
  }

  return { ok: true as const };
}

export async function POST(req: Request) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.res;

  const body = await req.json().catch(() => ({}));
  const userId = String(body?.userId || "");
  const role = body?.role;
  const approved = body?.approved;

  if (!userId) {
    return NextResponse.json({ ok: false, error: "userId required" }, { status: 400 });
  }
  if (role !== undefined && role !== "member" && role !== "admin") {
    return NextResponse.json({ ok: false, error: "invalid role" }, { status: 400 });
  }
  if (approved !== undefined && typeof approved !== "boolean") {
    return NextResponse.json({ ok: false, error: "approved must be boolean" }, { status: 400 });
  }

  // 기존값 읽어서 부분 업데이트 가능하게
  const { data: cur } = await supabaseAdmin
    .from("profiles")
    .select("id, role, approved")
    .eq("id", userId)
    .maybeSingle();

  const nextRole = (role ?? cur?.role ?? "member") as "member" | "admin";
  const nextApproved = (approved ?? (cur?.approved === true)) as boolean;

  const { data: updated, error: upErr } = await supabaseAdmin
    .from("profiles")
    .upsert(
      { id: userId, role: nextRole, approved: nextApproved },
      { onConflict: "id" },
    )
    .select("id, role, approved")
    .single();

  if (upErr || !updated) {
    return NextResponse.json({ ok: false, error: upErr?.message || "update failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, profile: updated });
}