import { NextResponse } from "next/server";
import { requireAdminOrThrow } from "@/lib/requireAdmin";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export const runtime = "nodejs";

export async function POST(req: Request) {
  await requireAdminOrThrow();

  const body = await req.json().catch(() => ({}));
  const boardSlug = String(body.boardSlug ?? "").trim();
  const title = String(body.title ?? "").trim();
  const kind = String(body.kind ?? "file").trim();
  const note = String(body.note ?? "").trim();
  const published_at = body.published_at ? String(body.published_at) : null;
  const visibility = (body.visibility ?? "public") as "public" | "member" | "admin";
  const r2_key = String(body.r2_key ?? "").trim();

  if (!boardSlug || !title || !r2_key) {
    return NextResponse.json(
      { ok: false, error: "boardSlug/title/r2_key required" },
      { status: 400 }
    );
  }

  const { data: board, error: be } = await supabaseAdmin
    .from("boards")
    .select("id")
    .eq("slug", boardSlug)
    .maybeSingle<{ id: number }>();

  if (be || !board) {
    return NextResponse.json({ ok: false, error: "invalid boardSlug" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("resources")
    .insert({
      board_id: board.id,
      title,
      kind,
      note,
      published_at,
      visibility,
      r2_key,
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, id: data.id });
}