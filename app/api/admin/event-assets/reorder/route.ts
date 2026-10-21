import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdminOrThrow } from "@/lib/requireAdmin";
import { CACHE_TAGS, invalidatePublicCache } from "@/lib/publicCache";
import { errorMessage, errorStatus } from "@/lib/errors";

export const runtime = "nodejs";

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

// Saves a drag-and-drop order: ids arrive in display order and get
// sort_order 10, 20, 30… (gaps leave room for manual inserts).
export async function POST(req: Request) {
  try {
    await requireAdminOrThrow();
    const body = await req.json().catch(() => ({}));
    const eventId = String(body.event_id ?? "").trim();
    const role = String(body.role ?? "").trim();
    const ids: string[] = Array.isArray(body.ids) ? body.ids.map((id: unknown) => String(id)) : [];
    if (!eventId || !role || ids.length === 0 || ids.length > 500) {
      return NextResponse.json({ ok: false, error: "event_id, role and ids are required" }, { status: 400 });
    }

    const results = await Promise.all(
      ids.map((id, index) =>
        sb.from("event_assets").update({ sort_order: (index + 1) * 10 }).eq("id", id).eq("event_id", eventId).eq("role", role),
      ),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) return NextResponse.json({ ok: false, error: failed.error.message }, { status: 500 });

    invalidatePublicCache(CACHE_TAGS.events);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: errorMessage(e) }, { status: errorStatus(e) });
  }
}
