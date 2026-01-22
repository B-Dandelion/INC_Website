// lib/adminAuth.ts
import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

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

  // 예시: profiles(role) 테이블에서 확인
  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (pErr || !profile) return { ok: false as const, status: 403, error: "no_profile" };
  if (profile.role !== "admin") return { ok: false as const, status: 403, error: "not_admin" };

  return { ok: true as const, user: data.user };
}