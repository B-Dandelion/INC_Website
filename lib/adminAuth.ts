// lib/adminAuth.ts
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

function getBearerToken(req: NextRequest) {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1] || null;
}

export async function requireAdmin(req: NextRequest) {
  const token = getBearerToken(req);
  if (!token) return { ok: false as const, status: 401, error: "missing_token" };

  const url = process.env.SUPABASE_URL!;
  const anon = process.env.SUPABASE_ANON_KEY!;
  const supabase = createClient(url, anon, { auth: { persistSession: false } });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return { ok: false as const, status: 401, error: "invalid_token" };

  const userId = data.user.id;

  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (pErr || !profile) return { ok: false as const, status: 403, error: "no_profile" };
  if (profile.role !== "admin") return { ok: false as const, status: 403, error: "not_admin" };

  return { ok: true as const, user: data.user };
}

// 서버 컴포넌트에서 쓰는 버전 추가
export async function isAdminServer() {
  const supabase = createSupabaseServerClient();

  const { data: userRes, error: uErr } = await supabase.auth.getUser();
  const user = userRes?.user;
  if (uErr || !user) return false;

  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (pErr || !profile) return false;
  return profile.role === "admin";
}