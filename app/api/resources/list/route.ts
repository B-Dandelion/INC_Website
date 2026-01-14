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

async function getBoardBySlug(slug: string) {
  const s = slug.trim();
  if (!s) return null;
  const { data } = await supabaseAdmin
    .from("boards")
    .select("id, slug, title")
    .eq("slug", s)
    .maybeSingle<{ id: number; slug: string; title: string }>();
  return data ?? null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const cat = (url.searchParams.get("cat") ?? "").trim();

  const authHeader = req.headers.get("authorization") || "";
  let userId: string | null = null;
  let role: Role = "member";
  let approved = false;

  // 1) 토큰이 있으면 유저/프로필 확인
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

  // 2) 이 유저가 "목록에서 볼 수 있는 visibility" 결정
  const allowed: Visibility[] = ["public"];
  if (isLoggedIn && approved) {
    allowed.push("member");
    if (role === "admin") allowed.push("admin");
  }

  // 3) cat(slug) -> board_id
  let board = null as null | { id: number; slug: string; title: string };
  if (cat) {
    board = await getBoardBySlug(cat);
    if (!board) {
      return NextResponse.json({ ok: true, items: [], auth: { isLoggedIn, approved, role } });
    }
  }

  // 4) resources 조회 (boards join 포함)
  let q = supabaseAdmin
    .from("resources")
    .select("id, board_id, title, kind, note, published_at, visibility, r2_key, boards:boards ( slug, title )")
    .in("visibility", allowed);

  if (board) q = q.eq("board_id", board.id); // 실제 필터 적용

  const { data, error } = await q
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const items = (data ?? []).map((r: any) => {
    const vis = r.visibility as Visibility;

    // 다운로드 권한(로그인/승인/관리자) + 실제 파일키(r2_key) 둘 다 만족해야 다운로드 버튼
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
      note: r.note ?? undefined,
      // published_at 없으면 created_at 날짜로 대체(YYYY-MM-DD)
      date,
      visibility: vis,
      canView: true,
      canDownload: canDownloadPerm && !!r.r2_key,
      // 카테고리 표시용
      boardSlug: r.boards?.slug ?? "",
      boardTitle: r.boards?.title ?? "",
    };
  });

  return NextResponse.json({
    ok: true,
    auth: { isLoggedIn, approved, role },
    items,
  });
}