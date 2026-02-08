// app/resources/item/[id]/ViewPing.tsx
"use client";
import { useEffect } from "react";

export default function ViewPing({ id }: { id: number }) {
  useEffect(() => {
    fetch(`/api/resources/${id}/view`, { method: "POST" }).catch(() => {});
  }, [id]);
  return null;
}