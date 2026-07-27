import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdminOrThrow } from "@/lib/requireAdmin";

export const runtime = "nodejs";

const sb = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function isYmd(value: unknown) {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value)
  );
}

export async function POST(req: Request) {
  try {
    await requireAdminOrThrow();
    const body = await req.json().catch(() => ({}));

    const category = String(body.category ?? "").trim();
    const titleKo = String(body.title_ko ?? "").trim();
    const eventDate = body.event_date ?? null;
    const periodEnd = body.period_end ?? null;

    if (!category) {
      return NextResponse.json(
        { ok: false, error: "category required" },
        { status: 400 }
      );
    }

    if (!titleKo) {
      return NextResponse.json(
        { ok: false, error: "행사명을 입력하세요." },
        { status: 400 }
      );
    }

    if (eventDate && !isYmd(eventDate)) {
      return NextResponse.json(
        { ok: false, error: "행사일 형식이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    if (periodEnd && !isYmd(periodEnd)) {
      return NextResponse.json(
        { ok: false, error: "기간 종료일 형식이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    if (eventDate && periodEnd && periodEnd < eventDate) {
      return NextResponse.json(
        {
          ok: false,
          error: "기간 종료일은 행사일보다 빠를 수 없습니다.",
        },
        { status: 400 }
      );
    }

    const insert = {
      category,
      subtype: body.subtype ?? null,
      series_year:
        typeof body.series_year === "number"
          ? body.series_year
          : null,
      title_ko: titleKo,
      title_en: body.title_en ?? null,
      event_date: eventDate,
      period_end: periodEnd,
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

    const { data, error } = await sb
      .from("events")
      .insert(insert)
      .select("*")
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, event: data });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: String(error?.message ?? error) },
      { status: error?.status ?? 500 }
    );
  }
}
