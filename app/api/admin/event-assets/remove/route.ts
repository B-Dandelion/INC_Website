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

    const { error } = await sb.from("event_assets").delete().eq("id", id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: e?.status ?? 500 });
  }
}
