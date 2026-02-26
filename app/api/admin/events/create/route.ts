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

    const category = String(body.category ?? "").trim();
    const title_ko = String(body.title_ko ?? "").trim();
    if (!category) return NextResponse.json({ ok: false, error: "category required" }, { status: 400 });
    if (!title_ko) return NextResponse.json({ ok: false, error: "title_ko required" }, { status: 400 });

    const insert = {
      category,
      subtype: body.subtype ?? null,
      series_year: typeof body.series_year === "number" ? body.series_year : null,
      title_ko,
      title_en: body.title_en ?? null,
      event_date: body.event_date ?? null,
      period_end: body.period_end ?? null,
      location_ko: body.location_ko ?? null,
      location_en: body.location_en ?? null,
      visibility: body.visibility ?? "public",
      start_time: body.start_time ?? null,
      end_time: body.end_time ?? null,
      topic_ko: body.topic_ko ?? null,
      topic_en: body.topic_en ?? null,
      audience_ko: body.audience_ko ?? null,
      audience_en: body.audience_en ?? null,
      contact_name: body.contact_name ?? null,
      contact_email: body.contact_email ?? null,
      contact_phone: body.contact_phone ?? null,
    };

    const { data, error } = await sb.from("events").insert(insert).select("*").maybeSingle();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, event: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: e?.status ?? 500 });
  }
}
