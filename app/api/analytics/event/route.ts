import { NextResponse } from "next/server";
import { recordSiteAnalyticsEvent, UUID_RE } from "@/lib/siteAnalyticsServer";

export const runtime = "nodejs";

const ALLOWED = new Set(["page_view", "search", "login", "signup"]);

function resolveReferrerHost(request: Request, referrer: unknown, isEntry: boolean) {
  if (!isEntry) return null;
  if (typeof referrer !== "string" || !referrer) return "Direct";

  try {
    const source = new URL(referrer);
    const current = new URL(request.url);
    return source.hostname === current.hostname ? "Internal" : source.hostname;
  } catch {
    return "Direct";
  }
}

export async function POST(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") return new NextResponse(null, { status: 204 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const eventType = typeof body.eventType === "string" ? body.eventType : "";
  if (!ALLOWED.has(eventType)) return new NextResponse(null, { status: 204 });

  const visitorId = typeof body.visitorId === "string" && UUID_RE.test(body.visitorId) ? body.visitorId : null;
  if (!visitorId) return new NextResponse(null, { status: 204 });

  const path = typeof body.path === "string" && body.path.startsWith("/") ? body.path.slice(0, 500) : "/";
  if (path.startsWith("/admin-x7k3p9") || path.startsWith("/admin/")) {
    return new NextResponse(null, { status: 204 });
  }

  const searchQuery = typeof body.searchQuery === "string" ? body.searchQuery.trim().slice(0, 200) : null;
  const isEntry = body.isEntry === true;
  const referrerHost = resolveReferrerHost(request, body.referrer, isEntry);

  await recordSiteAnalyticsEvent({
    request,
    eventType: eventType as "page_view" | "search" | "login" | "signup",
    visitorId,
    path,
    searchQuery,
    referrerHost,
    metadata: { entry: isEntry },
  });

  return new NextResponse(null, { status: 204 });
}
