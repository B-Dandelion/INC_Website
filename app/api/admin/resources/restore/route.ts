import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdminOrThrow } from "@/lib/requireAdmin";
import { CACHE_TAGS, invalidatePublicCache } from "@/lib/publicCache";
import { errorMessage, errorStatus } from "@/lib/errors";

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

    // Undo for a soft delete: clear deleted_at so the row shows up again.
    const { data: restored, error: updErr } = await supabaseAdmin
      .from("resources")
      .update({ deleted_at: null })
      .eq("id", resourceId)
      .not("deleted_at", "is", null)
      .select("id")
      .maybeSingle();

    if (updErr) return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });
    if (!restored) return NextResponse.json({ ok: false, error: "not found or not deleted" }, { status: 404 });

    invalidatePublicCache(CACHE_TAGS.resources, CACHE_TAGS.events);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const status = errorStatus(e);
    return NextResponse.json({ ok: false, error: errorMessage(e) }, { status });
  }
}