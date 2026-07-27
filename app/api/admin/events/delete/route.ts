import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdminOrThrow } from "@/lib/requireAdmin";

export const runtime = "nodejs";

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

export async function POST(req: Request) {
  try {
    await requireAdminOrThrow();
    const body = await req.json().catch(() => ({}));
    const id = String(body.id ?? "").trim();
    if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

    // 1) 연결된 event_assets 조회 (resource_id 수집)
    const { data: assets, error: aErr } = await sb
      .from("event_assets")
      .select("id, resource_id")
      .eq("event_id", id);

    if (aErr) return NextResponse.json({ ok: false, error: aErr.message }, { status: 500 });

    const resourceIds = Array.from(
      new Set((assets ?? []).map((x: any) => Number(x.resource_id)).filter((n) => Number.isFinite(n) && n > 0))
    );

    // 2) event_assets 삭제(연결 해제)
    const { error: delAssetsErr } = await sb.from("event_assets").delete().eq("event_id", id);
    if (delAssetsErr) return NextResponse.json({ ok: false, error: delAssetsErr.message }, { status: 500 });

    // 3) resources soft delete (행사에 포함된 자료 전부)
    if (resourceIds.length > 0) {
      const { error: softErr } = await sb
        .from("resources")
        .update({ deleted_at: new Date().toISOString() })
        .in("id", resourceIds);
      if (softErr) return NextResponse.json({ ok: false, error: softErr.message }, { status: 500 });
    }

    // 4) events 삭제
    const { error: delEventErr } = await sb.from("events").delete().eq("id", id);
    if (delEventErr) return NextResponse.json({ ok: false, error: delEventErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, deleted_resources: resourceIds.length });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: e?.status ?? 500 }
    );
  }
}