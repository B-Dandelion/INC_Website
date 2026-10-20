"use client";

import { useEffect } from "react";
import { trackSiteEvent } from "@/lib/siteAnalyticsClient";

export default function SearchAnalytics({
  query,
  total,
  resources,
  notices,
  events,
}: {
  query: string;
  total: number;
  resources: number;
  notices: number;
  events: number;
}) {
  useEffect(() => {
    const q = query.trim();
    if (!q) return;

    trackSiteEvent("search", {
      path: "/search",
      searchQuery: q,
      resultCount: total,
      resourceCount: resources,
      noticeCount: notices,
      eventCount: events,
    });
  }, [query, total, resources, notices, events]);

  return null;
}
