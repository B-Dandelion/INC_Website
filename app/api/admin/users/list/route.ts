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

async function requireAdmin(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return { ok: false as const, res: NextResponse.json({ ok: false, error: "missing token" }, { status: 401 }) };
  }

  const supabaseAuth = supabaseFromAuthHeader(authHeader);
  const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
  const user = userData?.user;

  if (userErr || !user) {
    return { ok: false as const, res: NextResponse.json({ ok: false, error: "invalid token" }, { status: 401 }) };
  }

  const { data: profile, error: profErr } = await supabaseAdmin
    .from("profiles")
    .select("role, approved")
    .eq("id", user.id)
    .maybeSingle();

  if (profErr || !profile || profile.role !== "admin" || profile.approved !== true) {
    return { ok: false as const, res: NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }) };
  }

  return { ok: true as const, userId: user.id };
}

export async function GET(req: Request) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.res;

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const perPage = Math.min(200, Math.max(1, Number(url.searchParams.get("perPage") || 50)));
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();

  const { data: usersRes, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
    page,
    perPage,
  });

  if (listErr) {
    return NextResponse.json({ ok: false, error: listErr.message }, { status: 500 });
  }

  const users = usersRes?.users ?? [];
  const filtered = q
    ? users.filter((u) => (u.email || "").toLowerCase().includes(q))
    : users;

  const ids = filtered.map((u) => u.id);
  const { data: profs } = ids.length
    ? await supabaseAdmin.from("profiles").select("id, role, approved").in("id", ids)
    : ({ data: [] as any[] } as any);

  const profMap = new Map<string, { role: string; approved: boolean }>();
  (profs ?? []).forEach((p: any) => profMap.set(p.id, { role: p.role, approved: p.approved === true }));

  const out = filtered.map((u) => {
    const p = profMap.get(u.id);
    return {
      id: u.id,
      email: u.email ?? null,
      createdAt: u.created_at ?? null,
      lastSignInAt: (u.last_sign_in_at as any) ?? null,
      role: (p?.role as "member" | "admin") ?? "member",
      approved: p?.approved ?? false,
    };
  });

  return NextResponse.json({ ok: true, users: out, page, perPage, total: out.length });
}