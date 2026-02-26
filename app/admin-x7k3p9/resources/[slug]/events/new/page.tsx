"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { adminSlugToEventCategory } from "@/lib/eventCategoryMap";

export default function AdminEventNewPage() {
  const params = useParams<{ slug: string }>();
  const sp = useSearchParams();
  const router = useRouter();

  const slug = String(params.slug || "");
  const map = adminSlugToEventCategory(slug);

  const subtypeFromQuery = sp.get("subtype") || "";
  const [titleKo, setTitleKo] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [subtype, setSubtype] = useState(subtypeFromQuery || map?.subtypeDefault || "");
  const [seriesYear, setSeriesYear] = useState<number | "">("");

  const can = useMemo(() => !!map && !!titleKo.trim(), [map, titleKo]);

  async function onCreate() {
    if (!can || !map) return;

    const body: any = {
      category: map.category,
      title_ko: titleKo.trim(),
      visibility: "public",
    };
    if (subtype.trim()) body.subtype = subtype.trim();
    if (eventDate) body.event_date = eventDate;
    if (periodEnd) body.period_end = periodEnd;
    if (typeof seriesYear === "number") body.series_year = seriesYear;

    const res = await fetch("/api/admin/events/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      alert(await res.text());
      return;
    }

    const j = await res.json();
    const id = j?.event?.id;
    router.push(`/admin-x7k3p9/resources/${slug}/events/${id}`);
  }

  if (!map) {
    return <div style={{ padding: 20 }}>행사형 카테고리가 아닙니다.</div>;
  }

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 900 }}>행사 추가: {slug}</h1>

      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <label style={lbl}>
          행사명(국문)
          <input value={titleKo} onChange={(e) => setTitleKo(e.target.value)} style={inp} />
        </label>

        <label style={lbl}>
          행사일
          <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} style={inp} />
        </label>

        <label style={lbl}>
          기간 종료(선택)
          <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} style={inp} />
        </label>

        <label style={lbl}>
          subtype(선택)
          <input value={subtype} onChange={(e) => setSubtype(e.target.value)} placeholder="seminar: domestic/international" style={inp} />
        </label>

        <label style={lbl}>
          연도(선택)
          <input
            value={seriesYear}
            onChange={(e) => setSeriesYear(e.target.value ? Number(e.target.value) : "")}
            placeholder="2025"
            style={inp}
          />
        </label>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCreate} disabled={!can} style={btn}>
            생성
          </button>
          <button onClick={() => router.back()} style={btn}>
            취소
          </button>
        </div>
      </div>
    </main>
  );
}

const lbl: React.CSSProperties = { display: "grid", gap: 6, fontSize: 14 };
const inp: React.CSSProperties = { border: "1px solid #ddd", borderRadius: 10, padding: 10 };
const btn: React.CSSProperties = { border: "1px solid #ddd", borderRadius: 10, padding: "10px 14px", background: "#fff", cursor: "pointer" };
