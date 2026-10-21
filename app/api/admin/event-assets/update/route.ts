import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdminOrThrow } from "@/lib/requireAdmin";
import { CACHE_TAGS, invalidatePublicCache } from "@/lib/publicCache";
import { errorMessage, errorStatus } from "@/lib/errors";

export const runtime = "nodejs";

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

const FIELDS = ["person_ko", "person_en", "item_title_ko", "item_title_en", "award"] as const;

// Edits the contest details attached to an event asset (winner, work title, award).
export async function POST(req: Request) {
  try {
    await requireAdminOrThrow();
    const body = await req.json().catch(() => ({}));
    const id = String(body.id ?? "").trim();
    if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

    const patch: Record<string, string | null> = {};
    for (const field of FIELDS) {
      if (field in body) patch[field] = typeof body[field] === "string" && body[field].trim() ? body[field].trim() : null;
    }
    if (Object.keys(patch).length === 0) return NextResponse.json({ ok: false, error: "no fields to update" }, { status: 400 });

    const { data, error } = await sb.from("event_assets").update(patch).eq("id", id).select("id").maybeSingle();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });

    invalidatePublicCache(CACHE_TAGS.events);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: errorMessage(e) }, { status: errorStatus(e) });
  }
}
