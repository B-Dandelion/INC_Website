"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackSiteEvent } from "@/lib/siteAnalyticsClient";

const ENTRY_KEY = "inc_analytics_entry_sent";

export default function SiteAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchString = searchParams.toString();

  useEffect(() => {
    if (!pathname) return;
    if (pathname.startsWith("/admin-x7k3p9") || pathname.startsWith("/admin/")) return;

    let isEntry = false;
    try {
      isEntry = sessionStorage.getItem(ENTRY_KEY) !== "1";
      if (isEntry) sessionStorage.setItem(ENTRY_KEY, "1");
    } catch {
      isEntry = false;
    }

    trackSiteEvent("page_view", { path: pathname, isEntry });

    if (pathname === "/search") {
      const query = searchParams.get("q")?.trim();
      if (query) trackSiteEvent("search", { path: pathname, searchQuery: query });
    }
  }, [pathname, searchString, searchParams]);

  return null;
}
