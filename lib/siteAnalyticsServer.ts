import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const VISITOR_COOKIE = "inc_vid";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type SiteAnalyticsEventType = "page_view" | "download" | "search" | "login" | "signup";

export function siteAnalyticsAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase server environment variables");
  return createClient(url, key, { auth: { persistSession: false } });
}

function analyticsEnabled() {
  if (process.env.VERCEL_ENV) return process.env.VERCEL_ENV === "production";
  return process.env.NODE_ENV === "production";
}

function parseCookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return null;
}

function deviceType(userAgent: string | null) {
  const ua = (userAgent ?? "").toLowerCase();
  if (!ua) return "unknown";
  if (/ipad|tablet|playbook|silk/.test(ua) || (/android/.test(ua) && !/mobile/.test(ua))) return "tablet";
  if (/mobile|iphone|ipod|android|blackberry|iemobile|opera mini/.test(ua)) return "mobile";
  return "desktop";
}

export function analyticsVisitorIdFromRequest(request: Request) {
  const candidate = parseCookieValue(request.headers.get("cookie"), VISITOR_COOKIE);
  return candidate && UUID_RE.test(candidate) ? candidate : crypto.randomUUID();
}

export async function recordSiteAnalyticsEvent({
  request,
  eventType,
  visitorId,
  path,
  resourceId,
  searchQuery,
  referrerHost,
  metadata,
}: {
  request: Request;
  eventType: SiteAnalyticsEventType;
  visitorId?: string | null;
  path?: string | null;
  resourceId?: number | null;
  searchQuery?: string | null;
  referrerHost?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  if (!analyticsEnabled()) return { skipped: true as const };

  const resolvedVisitor = visitorId && UUID_RE.test(visitorId) ? visitorId : analyticsVisitorIdFromRequest(request);
  const supabase = siteAnalyticsAdmin();
  const { error } = await supabase.rpc("record_site_analytics_event", {
    p_event_type: eventType,
    p_visitor_id: resolvedVisitor,
    p_path: path ?? null,
    p_resource_id: resourceId ?? null,
    p_search_query: searchQuery ?? null,
    p_referrer_host: referrerHost ?? null,
    p_device_type: deviceType(request.headers.get("user-agent")),
    p_metadata: metadata ?? {},
  });

  if (error) {
    console.error("[site-analytics] record failed", error.message);
    return { error: error.message };
  }

  return { ok: true as const };
}

export { VISITOR_COOKIE, UUID_RE };
