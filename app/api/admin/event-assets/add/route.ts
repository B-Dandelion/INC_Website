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

    const event_id = String(body.event_id ?? "").trim();
    const role = String(body.role ?? "").trim();
    const resource_id = Number(body.resource_id);

    if (!event_id) return NextResponse.json({ ok: false, error: "event_id required" }, { status: 400 });
    if (!role) return NextResponse.json({ ok: false, error: "role required" }, { status: 400 });
    if (!Number.isFinite(resource_id) || resource_id <= 0) {
      return NextResponse.json({ ok: false, error: "resource_id required" }, { status: 400 });
    }

    const insert = {
      event_id,
      role,
      resource_id,
      person_ko: body.person_ko ?? null,
      person_en: body.person_en ?? null,
      item_title_ko: body.item_title_ko ?? null,
      item_title_en: body.item_title_en ?? null,
      award: body.award ?? null,
      sort_order: typeof body.sort_order === "number" ? body.sort_order : 0,
    };

    const { data, error } = await sb.from("event_assets").insert(insert).select("*").maybeSingle();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, asset: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: e?.status ?? 500 });
  }
}
