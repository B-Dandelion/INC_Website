import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdminOrThrow } from "@/lib/requireAdmin";

export const runtime = "nodejs";

const supabaseAdmin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: Request) {
  try {
    await requireAdminOrThrow();

    const body = await req.json().catch(() => ({}));
    const resourceId = Number(body?.resourceId);

    if (!Number.isFinite(resourceId) || resourceId <= 0) {
      return NextResponse.json({ ok: false, error: "resourceId required" }, { status: 400 });
    }

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
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", resourceId)
      .is("deleted_at", null);

    if (updErr) return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const status = e?.status ?? 500;
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status });
  }
}