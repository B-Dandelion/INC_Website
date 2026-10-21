// app/api/resources/[id]/view/route.ts
// Counts one view of a resource whose page was opened (ATM / Heartbeat issue
// pages). Sent from the browser by ViewBeacon, so crawlers that don't run
// scripts are not counted; known bots are skipped here as well.
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Ctx = { params: Promise<{ id: string }> };

const BOT_UA = /bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit|embedly|curl|wget|python|node-fetch/i;

export async function POST(req: Request, { params }: Ctx) {
  const { id: idRaw } = await params;
  const id = Number(idRaw);

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  if (BOT_UA.test(req.headers.get("user-agent") ?? "")) {
    return NextResponse.json({ skipped: true });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: row } = await supabase
    .from("resources")
    .select("id")
    .eq("id", id)
    .eq("visibility", "public")
    .is("deleted_at", null)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { data, error } = await supabase.rpc("increment_resource_views", { rid: id });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ views_count: data ?? null });
}
