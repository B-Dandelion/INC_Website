"use client";

export type SiteAnalyticsEventType = "page_view" | "search" | "login" | "signup";

const VISITOR_COOKIE = "inc_vid";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  for (const part of document.cookie.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return null;
}

export function getAnalyticsVisitorId() {
  const existing = getCookie(VISITOR_COOKIE);
  if (existing) return existing;

  const id = crypto.randomUUID();
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${VISITOR_COOKIE}=${encodeURIComponent(id)}; Max-Age=${ONE_YEAR_SECONDS}; Path=/; SameSite=Lax${secure}`;
  return id;
}

export function trackSiteEvent(
  eventType: SiteAnalyticsEventType,
  options: {
    path?: string;
    searchQuery?: string | null;
    isEntry?: boolean;
  } = {},
) {
  if (typeof window === "undefined") return;
  if (navigator.doNotTrack === "1") return;

  const path = options.path ?? window.location.pathname;
  if (path.startsWith("/admin-x7k3p9") || path.startsWith("/admin/")) return;

  const payload = JSON.stringify({
    eventType,
    visitorId: getAnalyticsVisitorId(),
    path,
    searchQuery: options.searchQuery ?? null,
    isEntry: Boolean(options.isEntry),
    referrer: options.isEntry ? document.referrer : null,
  });

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/analytics/event", blob);
      return;
    }
  } catch {
    // Fallback to fetch below.
  }

  void fetch("/api/analytics/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    credentials: "same-origin",
    keepalive: true,
  }).catch(() => undefined);
}
