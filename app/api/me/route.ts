// app/api/me/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

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
type ReviewStatus = "pending" | "approved" | "rejected";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") || "";

  if (!authHeader.startsWith("Bearer ")) {
    return NextResponse.json({
      ok: true,
      isLoggedIn: false,
      approved: false,
      role: "member" as Role,
      reviewStatus: "pending" as ReviewStatus,
      rejectionReason: null,
      reviewedAt: null,
      user: null,
    });
  }

  const supabaseAuth = supabaseFromAuthHeader(authHeader);
  const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
  const user = userData?.user ?? null;

  if (userErr || !user) {
    return NextResponse.json({
      ok: true,
      isLoggedIn: false,
      approved: false,
      role: "member" as Role,
      reviewStatus: "pending" as ReviewStatus,
      rejectionReason: null,
      reviewedAt: null,
      user: null,
      error: "invalid token",
    });
  }

  const { data: profile, error: profErr } = await supabaseAdmin
    .from("profiles")
    .select("role,approved,review_status,rejection_reason,reviewed_at")
    .eq("id", user.id)
    .maybeSingle<{
      role: Role;
      approved: boolean;
      review_status: ReviewStatus | null;
      rejection_reason: string | null;
      reviewed_at: string | null;
    }>();

  if (profErr || !profile) {
    return NextResponse.json({
      ok: true,
      isLoggedIn: true,
      approved: false,
      role: "member" as Role,
      reviewStatus: "pending" as ReviewStatus,
      rejectionReason: null,
      reviewedAt: null,
      user: { id: user.id, email: user.email ?? null },
      error: profErr?.message ?? "profile not found",
    });
  }

  const reviewStatus: ReviewStatus = profile.approved
    ? "approved"
    : profile.review_status === "rejected"
      ? "rejected"
      : "pending";

  return NextResponse.json({
    ok: true,
    isLoggedIn: true,
    approved: profile.approved === true,
    role: (profile.role as Role) || ("member" as Role),
    reviewStatus,
    rejectionReason: profile.rejection_reason ?? null,
    reviewedAt: profile.reviewed_at ?? null,
    user: { id: user.id, email: user.email ?? null },
  });
}
