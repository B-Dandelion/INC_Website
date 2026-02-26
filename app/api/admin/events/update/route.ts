import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdminOrThrow } from "@/lib/requireAdmin";

export const runtime = "nodejs";

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

const ALLOWED = new Set([
  "subtype","series_year","title_ko","title_en","event_date","period_end",
  "location_ko","location_en","visibility","start_time","end_time",
  "topic_ko","topic_en","audience_ko","audience_en","contact_name","contact_email","contact_phone",
]);

export async function POST(req: Request) {
  try {
    await requireAdminOrThrow();
    const body = await req.json().catch(() => ({}));
    const id = String(body.id ?? "").trim();
    const patch = body.patch ?? {};

    if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

    const update: any = { updated_at: new Date().toISOString() };
    for (const [k, v] of Object.entries(patch)) {
      if (ALLOWED.has(k)) update[k] = v;
    }

    const keys = Object.keys(update).filter((k) => k !== "updated_at");
    if (keys.length === 0) {
      return NextResponse.json({ ok: false, error: "no fields to update" }, { status: 400 });
    }

    const { data, error } = await sb.from("events").update(update).eq("id", id).select("*").maybeSingle();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, event: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: e?.status ?? 500 });
  }
}
