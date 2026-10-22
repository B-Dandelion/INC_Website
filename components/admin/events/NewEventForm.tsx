"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { EventBoard } from "@/lib/boardRules";
import { Button, ButtonLink, Field, Select, TextInput } from "../ui";
import { goToAdminLogin } from "@/lib/adminNav";

export default function NewEventForm({ rule, initialSubtype }: { rule: EventBoard; initialSubtype?: string }) {
  const router = useRouter();
  const [subtype, setSubtype] = useState(initialSubtype ?? rule.defaultSubtype ?? "");
  const [titleKo, setTitleKo] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [seriesYear, setSeriesYear] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const periodError = eventDate && periodEnd && periodEnd < eventDate ? "기간 종료일은 행사일보다 빠를 수 없습니다." : "";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!titleKo.trim() || periodError) return;
    setErr("");
    setBusy(true);
    try {
      const body: Record<string, string | number> = { category: rule.category, title_ko: titleKo.trim(), visibility: "public" };
      if (subtype) body.subtype = subtype;
      if (eventDate) body.event_date = eventDate;
      if (periodEnd) body.period_end = periodEnd;
      if (seriesYear) body.series_year = Number(seriesYear);

      const res = await fetch("/api/admin/events/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status === 401) {
        goToAdminLogin();
        return;
      }
      const out = await res.json().catch(() => null);
      if (!res.ok) {
        setErr(out?.error ?? `행사를 만들지 못했습니다. (HTTP ${res.status})`);
        return;
      }
      const id = out?.event?.id;
      if (!id) {
        setErr("생성 응답에서 행사 ID를 받지 못했습니다.");
        return;
      }
      router.replace(`/admin-x7k3p9/resources/${rule.slug}/events/${id}`);
      router.refresh();
    } catch {
      setErr("행사를 만드는 중 네트워크 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 border border-slate-200 bg-white p-5 md:grid-cols-2">
      <Field label="행사명(국문)" required className="md:col-span-2">
        <TextInput autoFocus value={titleKo} onChange={(e) => setTitleKo(e.target.value)} />
      </Field>
      {rule.subtypes ? (
        <Field label="구분">
          <Select value={subtype} onChange={(e) => setSubtype(e.target.value)}>
            {rule.subtypes.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
      <Field label="연도" hint="선택. 공모전 회차 구분에 씁니다.">
        <TextInput type="number" min={1900} max={2200} placeholder="2026" value={seriesYear} onChange={(e) => setSeriesYear(e.target.value)} />
      </Field>
      <Field label="행사일">
        <TextInput type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
      </Field>
      <Field label="기간 종료" hint="여러 날 행사일 때만" error={periodError || undefined}>
        <TextInput type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
      </Field>
      {err ? (
        <p role="alert" className="text-sm font-medium text-red-700 md:col-span-2">
          {err}
        </p>
      ) : null}
      <div className="flex justify-end gap-2 md:col-span-2">
        <ButtonLink href={`/admin-x7k3p9/resources/${rule.slug}`}>취소</ButtonLink>
        <Button type="submit" variant="primary" disabled={busy || !titleKo.trim() || Boolean(periodError)}>
          {busy ? "만드는 중…" : "행사 만들기"}
        </Button>
      </div>
    </form>
  );
}
