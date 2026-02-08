// lib/supabaseServer.ts
import { createClient } from "@supabase/supabase-js";

export function createSupabaseServerClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

function must(name: string, v?: string) {
  if (!v) throw new Error(`[env] missing ${name}`);
  return v;
}

export function supabaseAnon() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

  return createClient(must("SUPABASE_URL", url), must("SUPABASE_ANON_KEY", key), {
    auth: { persistSession: false },
  });
}

export function supabaseService() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return createClient(
    must("SUPABASE_URL", url),
    must("SUPABASE_SERVICE_ROLE_KEY", key),
    { auth: { persistSession: false } }
  );
}
