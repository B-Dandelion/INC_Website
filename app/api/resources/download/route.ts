// app/api/resources/download/route.ts
import { NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";

type Visibility = "public" | "member" | "admin";

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

// 서비스 롤: resources/profiles 조회용 (서버에서만 사용)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function roleAllows(visibility: Visibility, role: string) {
  if (visibility === "public") return true;
  if (visibility === "member") return role === "member" || role === "admin";
  if (visibility === "admin") return role === "admin";
  return false;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "missing id" }, { status: 400 });
  }

  // 1) 리소스 메타 조회 (서비스 롤로)
  const { data: resource, error: resErr } = await supabaseAdmin
    .from("resources")
    .select("id, visibility, r2_key")
    .eq("id", id)
    .single();

  if (resErr || !resource) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const visibility = resource.visibility as Visibility;

  // public은 바로 redirect
  if (visibility === "public") {
    if (!resource.r2_key) {
      return NextResponse.json({ error: "missing r2_key" }, { status: 500 });
    }
    const publicUrl = `${process.env.R2_PUBLIC_BASE_URL}/${resource.r2_key}`;
    return NextResponse.redirect(publicUrl);
  }

  // 2) 로그인 유저 확인 (쿠키 세션 기반)
  const supabase = createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    // 로그인으로 보내고, 로그인 후 다시 이 다운로드 URL로 돌아오게
    const next = encodeURIComponent(`/api/resources/download?id=${id}`);
    return NextResponse.redirect(new URL(`/login?next=${next}`, url.origin));
  }

  // 3) 승인/role 확인
  const { data: profile, error: profErr } = await supabaseAdmin
    .from("profiles")
    .select("role, approved")
    .eq("id", user.id)
    .single();

  if (profErr || !profile) {
    return NextResponse.json({ error: "profile not found" }, { status: 403 });
  }

  if (!profile.approved) {
    return NextResponse.json({ error: "approval required" }, { status: 403 });
  }

  const role = String(profile.role || "member");
  if (!roleAllows(visibility, role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // 4) private bucket signed url 생성 후 redirect
  if (!resource.r2_key) {
    return NextResponse.json({ error: "missing r2_key" }, { status: 500 });
  }

  const signed = await getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: process.env.R2_PRIVATE_BUCKET!,
      Key: resource.r2_key,
    }),
    { expiresIn: 60 }, // 60초면 충분
  );

  return NextResponse.redirect(signed);
}
