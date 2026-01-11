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

export async function GET(req: Request) {
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
  // - 비로그인: public만
  // - 로그인 + 승인X: public만
  // - 로그인 + 승인O: public + member (+ admin if admin)
  const allowed: Visibility[] = ["public"];
  if (isLoggedIn && approved) {
    allowed.push("member");
    if (role === "admin") allowed.push("admin");
  }

  const { data, error } = await supabaseAdmin
    .from("resources")
    .select("id, title, kind, note, published_at, visibility")
    .in("visibility", allowed)
    .order("published_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const items = (data ?? []).map((r) => {
    const vis = r.visibility as Visibility;

    // public 다운로드는 "로그인"이면 가능, 비로그인은 불가
    const canDownload =
      vis === "public"
        ? isLoggedIn
        : approved && (vis === "member" || (vis === "admin" && role === "admin"));

    return {
      id: r.id,
      title: r.title,
      kind: r.kind,
      note: r.note ?? undefined,
      date: r.published_at ?? undefined,
      visibility: vis,
      canView: true,
      canDownload,
    };
  });

  return NextResponse.json({
    ok: true,
    auth: { isLoggedIn, approved, role },
    items,
  });
}
