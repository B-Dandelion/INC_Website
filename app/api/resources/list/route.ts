// app/api/resources/list/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type Role = "member" | "admin";
type Visibility = "public" | "member" | "admin";
type BoardRow = { id: number; slug: string; title: string };

function getBearerToken(authHeader: string) {
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  return m?.[1] || null;
}

async function getBoardBySlug(slug: string) {
  const s = slug.trim();
  if (!s) return null;

  const { data, error } = await supabaseAdmin
    .from("boards")
    .select("id, slug, title")
    .eq("slug", s)
    .maybeSingle<BoardRow>();

  if (error) return null;
  return data ?? null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const cat = (url.searchParams.get("cat") ?? "").trim();

  const authHeader = req.headers.get("authorization") || "";
  const token = getBearerToken(authHeader);

  let userId: string | null = null;
  let role: Role = "member";
  let approved = false;

  if (token) {
    const supabaseAnon = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );

    const { data: userData } = await supabaseAnon.auth.getUser(token);
    userId = userData.user?.id ?? null;

    if (userId) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("role, approved")
        .eq("id", userId)
        .maybeSingle();

      role = (profile?.role as Role) || "member";
      approved = profile?.approved === true;
    }
  }

  const isLoggedIn = !!userId;

  const allowed: Visibility[] = ["public"];
  if (isLoggedIn && approved) {
    allowed.push("member");
    if (role === "admin") allowed.push("admin");
  }

  let board: BoardRow | null = null;
  if (cat) {
    board = await getBoardBySlug(cat);
    if (!board) {
      return NextResponse.json(
        { ok: true, auth: { isLoggedIn, approved, role }, items: [] },
        { headers: { "Cache-Control": "no-store", Vary: "Authorization" } }
      );
    }
  }

  let q = supabaseAdmin
    .from("resources")
    .select(
      [
        "id",
        "board_id",
        "title",
        "displayname",
        "kind",
        "published_at",
        "created_at",
        "visibility",
        "r2_key",
        "original_filename",
        "boards:boards ( slug, title )",
      ].join(", ")
    )
    .in("visibility", allowed)
    .is("deleted_at", null);

  if (board) q = q.eq("board_id", board.id);

  const { data, error } = await q
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500, headers: { "Cache-Control": "no-store", Vary: "Authorization" } }
    );
  }

  const items = (data ?? []).map((r: any) => {
    const vis = r.visibility as Visibility;

    // NOTE: 현재 설계는 public도 다운로드는 로그인 필요(isLoggedIn)로 되어 있음.
    // 익명 다운로드를 허용하려면 vis==="public"일 때 true로 바꿔야 함.
    const canDownloadPerm =
      vis === "public"
        ? isLoggedIn
        : approved && (vis === "member" || (vis === "admin" && role === "admin"));

    const date = r.published_at ?? (r.created_at ? String(r.created_at).slice(0, 10) : "");

    return {
      id: r.id,
      title: r.title,
      kind: r.kind,
      displayname: r.displayname ?? undefined,
      date,
      visibility: vis,
      canView: true,
      canDownload: canDownloadPerm && !!r.r2_key,
      boardSlug: r.boards?.slug ?? "",
      boardTitle: r.boards?.title ?? "",
      originalFilename: r.original_filename ?? null,
    };
  });

  return NextResponse.json(
    { ok: true, auth: { isLoggedIn, approved, role }, items },
    { headers: { "Cache-Control": "no-store", Vary: "Authorization" } }
  );
}