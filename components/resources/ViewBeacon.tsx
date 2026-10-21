"use client";
// Counts one view when a resource page is opened. Reloading the same page in
// the same browser within 30 minutes is not counted again.
import { useEffect } from "react";

const WINDOW_MS = 30 * 60 * 1000;

export default function ViewBeacon({ id }: { id: number }) {
  useEffect(() => {
    const key = `inc:viewed:${id}`;
    try {
      const last = Number(localStorage.getItem(key));
      if (last && Date.now() - last < WINDOW_MS) return;
      localStorage.setItem(key, String(Date.now()));
    } catch {
      // Storage blocked (private mode): count anyway.
    }
    fetch(`/api/resources/${id}/view`, { method: "POST", keepalive: true }).catch(() => {});
  }, [id]);
  return null;
}
