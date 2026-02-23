import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdminOrThrow } from "@/lib/requireAdmin";

export const runtime = "nodejs";

const supabaseAdmin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

function isYmd(s: any) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

type Visibility = "public" | "member" | "admin";
const VIS_SET = new Set<Visibility>(["public", "member", "admin"]);

export async function POST(req: Request) {
  try {
    await requireAdminOrThrow();

    const body = await req.json().catch(() => ({}));
    const resourceId = Number(body?.resourceId);

    if (!Number.isFinite(resourceId) || resourceId <= 0) {
      return NextResponse.json({ ok: false, error: "invalid resourceId" }, { status: 400 });
    }

    const patch: any = { updated_at: new Date().toISOString() };

    if (typeof body.title === "string") patch.title = body.title.trim();
    if (typeof body.note === "string") patch.note = body.note.trim() || null;
    if (typeof body.displayname === "string") patch.displayname = body.displayname.trim() || null;
    if (typeof body.source_path === "string") patch.source_path = body.source_path.trim() || null;

    if (body.visibility != null) {
      const v = String(body.visibility).trim() as Visibility;
      if (!VIS_SET.has(v)) return NextResponse.json({ ok: false, error: "invalid visibility" }, { status: 400 });
      patch.visibility = v;
    }

    if (body.published_at != null) {
      if (!isYmd(body.published_at)) {
        return NextResponse.json({ ok: false, error: "published_at must be YYYY-MM-DD" }, { status: 400 });
      }
      patch.published_at = body.published_at;
    }

    // 아무 것도 없으면 업데이트 의미 없음
    const keys = Object.keys(patch).filter((k) => k !== "updated_at");
    if (keys.length === 0) {
      return NextResponse.json({ ok: false, error: "no fields to update" }, { status: 400 });
    }

    const { data: updated, error: upErr } = await supabaseAdmin
      .from("resources")
      .update(patch)
      .eq("id", resourceId)
      .select("id,title,note,displayname,source_path,visibility,published_at,posted_at,updated_at")
      .maybeSingle();

    if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });
    if (!updated) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });

    return NextResponse.json({ ok: true, resource: updated });
  } catch (e: any) {
    const status = e?.status ?? 500;
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status });
  }
}