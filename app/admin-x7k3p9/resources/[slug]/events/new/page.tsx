"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { adminSlugToEventCategory } from "@/lib/eventCategoryMap";

export default function AdminEventNewPage() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const slug = String(params.slug || "");
  const map = adminSlugToEventCategory(slug);

  const subtypeFromQuery = searchParams.get("subtype") || "";
  const initialSubtype =
    slug === "seminar"
      ? subtypeFromQuery === "international"
        ? "international"
        : "domestic"
      : slug === "midterm-report"
        ? subtypeFromQuery === "final"
          ? "final"
          : "midterm"
        : subtypeFromQuery || map?.subtypeDefault || "";

  const [subtype, setSubtype] = useState(initialSubtype);
  const [titleKo, setTitleKo] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [seriesYear, setSeriesYear] = useState<number | "">("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const canCreate = useMemo(
    () => !!map && !!titleKo.trim() && !busy,
    [map, titleKo, busy]
  );

  async function onCreate() {
    if (!canCreate || !map) return;
    setErr("");

    if (eventDate && periodEnd && periodEnd < eventDate) {
      setErr("기간 종료일은 행사일보다 빠를 수 없습니다.");
      return;
    }

    setBusy(true);

    try {
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

      const out = await res.json().catch(() => null);

      if (res.status === 401) {
        alert("관리자 세션이 만료되었습니다. 다시 로그인해 주세요.");
        location.href = "/admin-x7k3p9?reason=session";
        return;
      }

      if (!res.ok) {
        setErr(out?.error ?? `행사 생성 실패 (HTTP ${res.status})`);
        return;
      }

      const id = out?.event?.id;
      if (!id) {
        setErr("생성 응답에서 행사 ID를 받지 못했습니다.");
        return;
      }

      router.replace(
        `/admin-x7k3p9/resources/${slug}/events/${id}`
      );
      router.refresh();
    } catch {
      setErr("행사 생성 중 네트워크 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  if (!map) {
    return (
      <div style={{ padding: 20 }}>
        행사형 카테고리가 아닙니다.
      </div>
    );
  }

  const showSubtype =
    slug === "seminar" || slug === "midterm-report";

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 900 }}>
        행사 추가: {slug}
      </h1>

      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <label style={labelStyle}>
          행사명(국문)
          <input
            value={titleKo}
            onChange={(e) => setTitleKo(e.target.value)}
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          행사일
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          기간 종료(선택)
          <input
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            style={inputStyle}
          />
        </label>

        {showSubtype ? (
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>구분</div>
            <select
              value={subtype}
              onChange={(e) => setSubtype(e.target.value)}
              style={inputStyle}
            >
              {slug === "seminar" ? (
                <>
                  <option value="domestic">국내</option>
                  <option value="international">국제</option>
                </>
              ) : (
                <>
                  <option value="midterm">중간보고회</option>
                  <option value="final">최종보고회</option>
                </>
              )}
            </select>
          </div>
        ) : null}

        <label style={labelStyle}>
          연도(선택)
          <input
            type="number"
            min={1900}
            max={2200}
            value={seriesYear}
            onChange={(e) =>
              setSeriesYear(
                e.target.value ? Number(e.target.value) : ""
              )
            }
            placeholder="2026"
            style={inputStyle}
          />
        </label>

        {err ? (
          <div style={{ color: "crimson", whiteSpace: "pre-wrap" }}>
            {err}
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onCreate}
            disabled={!canCreate}
            style={buttonStyle}
          >
            {busy ? "생성 중..." : "생성"}
          </button>
          <button
            onClick={() => router.back()}
            disabled={busy}
            style={buttonStyle}
          >
            취소
          </button>
        </div>
      </div>
    </main>
  );
}

const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  fontSize: 14,
};

const inputStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 10,
  padding: 10,
};

const buttonStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 10,
  padding: "10px 14px",
  background: "#fff",
  cursor: "pointer",
};
