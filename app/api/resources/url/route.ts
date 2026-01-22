import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const runtime = "nodejs";

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

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
type Mode = "view" | "download";

function safeFileName(name: string) {
  return name.replace(/[^\w.\-가-힣]+/g, "_");
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as null | { resourceId?: number; mode?: Mode };
  const resourceId = Number(body?.resourceId);
  if (!Number.isFinite(resourceId) || resourceId <= 0) {
    return NextResponse.json({ ok: false, error: "missing resourceId" }, { status: 400 });
  }
  const mode: Mode = body?.mode === "download" ? "download" : "view";

  if (!resourceId) {
    return NextResponse.json({ ok: false, error: "missing resourceId" }, { status: 400 });
  }

  // 1) 리소스 조회
  const { data: r, error: rErr } = await supabaseAdmin
    .from("resources")
    .select("id, title, kind, visibility, r2_key, mime, deleted_at")
    .eq("id", resourceId)
    .maybeSingle();

  if (rErr || !r || r.deleted_at) {
    return NextResponse.json({ ok: false, error: "resource not found" }, { status: 404 });
  }
  const visibility = r.visibility as Visibility;

  // 2) 요청자 인증(있으면) + 프로필 확인
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

  // 3) 접근 규칙
  // - 비로그인: public "view"만 허용, download는 금지
  if (!isLoggedIn) {
    if (visibility !== "public") {
      return NextResponse.json({ ok: false, error: "login required" }, { status: 401 });
    }
    if (mode === "download") {
      return NextResponse.json({ ok: false, error: "login required for download" }, { status: 401 });
    }
  }

  // - member/admin 자료: approved 필요
  if (visibility === "member") {
    if (!isLoggedIn || !approved) {
      return NextResponse.json({ ok: false, error: "approved required" }, { status: 403 });
    }
  }

  if (visibility === "admin") {
    if (!isLoggedIn || !approved || role !== "admin") {
      return NextResponse.json({ ok: false, error: "admin required" }, { status: 403 });
    }
  }

  // 4) signed URL 발급
  // 권장: public도 포함해서 전부 PRIVATE 버킷에 저장하고 여기서만 열게 만들기
  // 지금 구조 유지 시에는 public/member에 따라 버킷 분기
  const bucket =
    visibility === "public" ? process.env.R2_PUBLIC_BUCKET! : process.env.R2_PRIVATE_BUCKET!;

  const key = r.r2_key;
  if (!key) {
    return NextResponse.json({ ok: false, error: "missing r2_key" }, { status: 500 });
  }

  const filename = safeFileName(`${r.title || "file"}`);
  const disposition = mode === "download" ? "attachment" : "inline";

  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseContentType: r.mime || undefined,
      ResponseContentDisposition: `${disposition}; filename="${filename}"`,
    }),
    { expiresIn: 60 }, // 60초만 유효
  );

  return NextResponse.json({ ok: true, url });
}
