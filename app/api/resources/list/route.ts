// app/api/resources/list/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function supabaseFromAuthHeader(authHeader: string) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: authHeader } },
  });
}

type Role = "member" | "admin";
type Visibility = "public" | "member" | "admin";

type BoardRow = { id: number; slug: string; title: string };

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

  // 프론트는 cat, 혹시 다른 곳에서 boardSlug로 보내도 먹게
  const cat = (url.searchParams.get("cat") ?? "").trim();
  const boardSlug = (url.searchParams.get("boardSlug") ?? "").trim();
  const slug = cat || boardSlug;

  const authHeader = req.headers.get("authorization") || "";
  let userId: string | null = null;
  let role: Role = "member";
  let approved = false;

  if (authHeader.startsWith("Bearer ")) {
    const supabaseAuth = supabaseFromAuthHeader(authHeader);
    const { data: userData } = await supabaseAuth.auth.getUser();
    userId = userData.user?.id ?? null;

    if (userId) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("role, approved")
        .eq("id", userId)
        .single();

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

  // slug -> board_id
  let board: BoardRow | null = null;
  if (slug) {
    board = await getBoardBySlug(slug);
    if (!board) {
      return NextResponse.json({
        ok: true,
        auth: { isLoggedIn, approved, role },
        items: [],
      });
    }
  }

  let q = supabaseAdmin
    .from("resources")
    .select(
      `
      id,
      board_id,
      title,
      kind,
      displayname,
      published_at,
      created_at,
      visibility,
      r2_key,
      original_filename,
      boards:boards ( slug, title )
    `,
    )
    .in("visibility", allowed)
    .is("deleted_at", null);

  if (board) q = q.eq("board_id", board.id);

  const { data, error } = await q
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const items = (data ?? []).map((r: any) => {
    const vis = r.visibility as Visibility;

    const canDownloadPerm =
      vis === "public"
        ? isLoggedIn
        : approved && (vis === "member" || (vis === "admin" && role === "admin"));

    const date =
      r.published_at ?? (r.created_at ? String(r.created_at).slice(0, 10) : "");

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

  return NextResponse.json({
    ok: true,
    auth: { isLoggedIn, approved, role },
    items,
  });
}