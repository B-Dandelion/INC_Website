import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdminOrThrow } from "@/lib/requireAdmin";

export const runtime = "nodejs";

const sb = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const SINGLE_ASSET_ROLES = new Set([
  "poster_ko",
  "poster_en",
  "timetable",
]);

export async function POST(req: Request) {
  try {
    await requireAdminOrThrow();
    const body = await req.json().catch(() => ({}));

    const eventId = String(body.event_id ?? "").trim();
    const role = String(body.role ?? "").trim();
    const resourceId = Number(body.resource_id);

    if (!eventId) {
      return NextResponse.json(
        { ok: false, error: "event_id required" },
        { status: 400 }
      );
    }

    if (!role) {
      return NextResponse.json(
        { ok: false, error: "role required" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(resourceId) || resourceId <= 0) {
      return NextResponse.json(
        { ok: false, error: "resource_id required" },
        { status: 400 }
      );
    }

    const values = {
      event_id: eventId,
      role,
      resource_id: resourceId,
      person_ko: body.person_ko ?? null,
      person_en: body.person_en ?? null,
      item_title_ko: body.item_title_ko ?? null,
      item_title_en: body.item_title_en ?? null,
      award: body.award ?? null,
      sort_order:
        typeof body.sort_order === "number" ? body.sort_order : 0,
    };

    if (SINGLE_ASSET_ROLES.has(role)) {
      const { data: existingRows, error: existingError } = await sb
        .from("event_assets")
        .select("id,resource_id,sort_order")
        .eq("event_id", eventId)
        .eq("role", role)
        .order("sort_order", { ascending: true })
        .order("id", { ascending: true })
        .limit(1);

      if (existingError) {
        return NextResponse.json(
          { ok: false, error: existingError.message },
          { status: 500 }
        );
      }

      const existing = existingRows?.[0] ?? null;

      if (existing?.id) {
        const oldResourceId = Number(existing.resource_id);

        const { data, error } = await sb
          .from("event_assets")
          .update({
            resource_id: resourceId,
            person_ko: values.person_ko,
            person_en: values.person_en,
            item_title_ko: values.item_title_ko,
            item_title_en: values.item_title_en,
            award: values.award,
            sort_order: values.sort_order,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select("*")
          .maybeSingle();

        if (error) {
          return NextResponse.json(
            { ok: false, error: error.message },
            { status: 500 }
          );
        }

        let cleanupWarning: string | null = null;

        if (
          Number.isFinite(oldResourceId) &&
          oldResourceId > 0 &&
          oldResourceId !== resourceId
        ) {
          const { count, error: countError } = await sb
            .from("event_assets")
            .select("id", { count: "exact", head: true })
            .eq("resource_id", oldResourceId);

          if (countError) {
            cleanupWarning = countError.message;
          } else if ((count ?? 0) === 0) {
            const { error: cleanupError } = await sb
              .from("resources")
              .update({ deleted_at: new Date().toISOString() })
              .eq("id", oldResourceId)
              .is("deleted_at", null);

            if (cleanupError) {
              cleanupWarning = cleanupError.message;
            }
          }
        }

        return NextResponse.json({
          ok: true,
          asset: data,
          replacedExisting: true,
          cleanupWarning,
        });
      }
    }

    const { data, error } = await sb
      .from("event_assets")
      .insert(values)
      .select("*")
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, asset: data });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: String(error?.message ?? error) },
      { status: error?.status ?? 500 }
    );
  }
}
