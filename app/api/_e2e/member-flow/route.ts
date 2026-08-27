import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseService } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function anonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );
}

export async function GET(req: Request) {
  if (process.env.VERCEL_ENV !== "preview") {
    return NextResponse.json({ ok: false, error: "preview only" }, { status: 404 });
  }

  const service = supabaseService();
  const nonce = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const email = `inc-e2e-${nonce}@example.com`;
  const password = `E2e-${crypto.randomBytes(12).toString("base64url")}!9a`;
  let userId: string | null = null;

  const steps: Array<{ step: string; ok: boolean; detail?: unknown }> = [];

  try {
    const signupClient = anonClient();
    const { data: signup, error: signupError } = await signupClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: "E2E 테스트 회원",
          phone: "010-0000-0000",
          affiliation: "INC E2E Test",
        },
      },
    });

    if (signupError || !signup.user) {
      steps.push({ step: "signup", ok: false, detail: signupError?.message ?? "user missing" });
      return NextResponse.json({ ok: false, steps });
    }

    userId = signup.user.id;
    steps.push({ step: "signup", ok: true, detail: { userCreated: true, sessionCreated: Boolean(signup.session) } });

    const { data: pendingProfile, error: profileError } = await service
      .from("profiles")
      .select("id,email,name,phone,affiliation,role,approved,review_status,hidden_from_member_management")
      .eq("id", userId)
      .maybeSingle();

    const profileCreated = !profileError && Boolean(pendingProfile);
    const profileCorrect = Boolean(
      pendingProfile &&
        pendingProfile.role === "member" &&
        pendingProfile.approved === false &&
        pendingProfile.review_status === "pending" &&
        pendingProfile.name === "E2E 테스트 회원" &&
        pendingProfile.affiliation === "INC E2E Test" &&
        pendingProfile.hidden_from_member_management === false
    );
    steps.push({ step: "profile-trigger", ok: profileCreated && profileCorrect, detail: pendingProfile ?? profileError?.message });

    const { error: confirmError } = await service.auth.admin.updateUserById(userId, { email_confirm: true });
    steps.push({ step: "test-email-confirm", ok: !confirmError, detail: confirmError?.message });
    if (confirmError) return NextResponse.json({ ok: false, steps });

    const pendingLogin = anonClient();
    const { data: pendingSession, error: pendingLoginError } = await pendingLogin.auth.signInWithPassword({ email, password });
    steps.push({ step: "login-before-approval", ok: !pendingLoginError && Boolean(pendingSession.session), detail: pendingLoginError?.message });

    if (pendingSession.session?.access_token) {
      const meRes = await fetch(new URL("/api/me", req.url), {
        headers: { Authorization: `Bearer ${pendingSession.session.access_token}` },
        cache: "no-store",
      });
      const me = await meRes.json().catch(() => null);
      steps.push({
        step: "app-status-before-approval",
        ok: meRes.ok && me?.approved === false && me?.reviewStatus === "pending",
        detail: me,
      });
    } else {
      steps.push({ step: "app-status-before-approval", ok: false, detail: "no access token" });
    }

    const reviewedAt = new Date().toISOString();
    const { error: approveError } = await service
      .from("profiles")
      .update({
        approved: true,
        review_status: "approved",
        rejection_reason: null,
        reviewed_at: reviewedAt,
        updated_at: reviewedAt,
      })
      .eq("id", userId)
      .eq("role", "member")
      .eq("hidden_from_member_management", false);
    steps.push({ step: "approve-member", ok: !approveError, detail: approveError?.message });
    if (approveError) return NextResponse.json({ ok: false, steps });

    const approvedLogin = anonClient();
    const { data: approvedSession, error: approvedLoginError } = await approvedLogin.auth.signInWithPassword({ email, password });
    steps.push({ step: "login-after-approval", ok: !approvedLoginError && Boolean(approvedSession.session), detail: approvedLoginError?.message });

    if (approvedSession.session?.access_token) {
      const meRes = await fetch(new URL("/api/me", req.url), {
        headers: { Authorization: `Bearer ${approvedSession.session.access_token}` },
        cache: "no-store",
      });
      const me = await meRes.json().catch(() => null);
      steps.push({
        step: "app-status-after-approval",
        ok: meRes.ok && me?.isLoggedIn === true && me?.approved === true && me?.reviewStatus === "approved" && me?.role === "member",
        detail: me,
      });
    } else {
      steps.push({ step: "app-status-after-approval", ok: false, detail: "no access token" });
    }

    const { data: approvedProfile } = await service
      .from("profiles")
      .select("approved,review_status,reviewed_at")
      .eq("id", userId)
      .maybeSingle();
    steps.push({
      step: "approved-profile-persisted",
      ok: approvedProfile?.approved === true && approvedProfile?.review_status === "approved" && Boolean(approvedProfile?.reviewed_at),
      detail: approvedProfile,
    });

    return NextResponse.json({ ok: steps.every((s) => s.ok), steps });
  } finally {
    if (userId) {
      await service.auth.admin.deleteUser(userId).catch(() => undefined);
      await service.from("profiles").delete().eq("id", userId).catch(() => undefined);
    }
  }
}
