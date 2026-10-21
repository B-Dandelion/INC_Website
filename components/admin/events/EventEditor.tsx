"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import type { AssetSlot, EventBoard } from "@/lib/boardRules";
import type { EventAssetRow } from "@/lib/eventsDb";
import { VISIBILITIES } from "@/lib/resourceFilters";
import type { AdminEvent } from "../AdminEventDetailClient";
import { FALLBACK_ROLE_LABELS } from "../eventDetail/constants";
import { Button, Card, Field, Select, TextInput } from "../ui";
import { useConfirm } from "../ui/ConfirmDialog";
import { useToast } from "../ui/Toast";
import { VISIBILITY_LABEL } from "../resources/labels";
import { SessionExpired, postJson } from "../resources/uploadClient";
import SlotSection from "./SlotSection";

const CONTEST_BOARDS = new Set(["essay-contest", "shortform-contest"]);

function EventMetaCard({ rule, event }: { rule: EventBoard; event: AdminEvent }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState({
    title_ko: event.title_ko ?? "",
    event_date: event.event_date ?? "",
    period_end: event.period_end ?? "",
    visibility: event.visibility ?? "public",
    subtype: event.subtype ?? "",
  });
  const [busy, setBusy] = useState(false);
  const periodError = form.event_date && form.period_end && form.period_end < form.event_date ? "기간 종료일은 행사일보다 빠를 수 없습니다." : "";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.title_ko.trim() || periodError) return;
    setBusy(true);
    try {
      const patch: Record<string, string | null> = {
        title_ko: form.title_ko.trim(),
        event_date: form.event_date || null,
        period_end: form.period_end || null,
        visibility: form.visibility,
      };
      if (rule.subtypes) patch.subtype = form.subtype || null;
      await postJson("/api/admin/events/update", { id: event.id, patch });
      toast("행사 정보를 저장했습니다.", "success");
      router.refresh();
    } catch (error) {
      if (!(error instanceof SessionExpired)) toast(`저장하지 못했습니다.\n${error instanceof Error ? error.message : String(error)}`, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="행사 정보" description="공개 화면의 제목과 기간에 그대로 쓰입니다.">
      <form onSubmit={onSubmit} className="grid gap-3 p-5 md:grid-cols-4">
        <Field label="행사명(국문)" required className="md:col-span-4">
          <TextInput value={form.title_ko} onChange={(e) => setForm({ ...form, title_ko: e.target.value })} />
        </Field>
        <Field label="행사일">
          <TextInput type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
        </Field>
        <Field label="기간 종료" error={periodError || undefined}>
          <TextInput type="date" value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })} />
        </Field>
        <Field label="공개 범위">
          <Select value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })}>
            {VISIBILITIES.map((v) => (
              <option key={v} value={v}>
                {VISIBILITY_LABEL[v]}
              </option>
            ))}
          </Select>
        </Field>
        {rule.subtypes ? (
          <Field label="구분">
            <Select value={form.subtype} onChange={(e) => setForm({ ...form, subtype: e.target.value })}>
              {rule.subtypes.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
        <div className="flex justify-end md:col-span-4">
          <Button type="submit" variant="primary" disabled={busy || !form.title_ko.trim() || Boolean(periodError)}>
            {busy ? "저장 중…" : "행사 정보 저장"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export default function EventEditor({ rule, event, assets }: { rule: EventBoard; event: AdminEvent; assets: EventAssetRow[] }) {
  const confirmDialog = useConfirm();
  const toast = useToast();
  const [deleting, setDeleting] = useState(false);

  const byRole = new Map<string, EventAssetRow[]>();
  for (const asset of assets) {
    const list = byRole.get(asset.role) ?? [];
    list.push(asset);
    byRole.set(asset.role, list);
  }

  const posters = rule.slots.filter((s) => s.role.startsWith("poster_"));
  const others = rule.slots.filter((s) => !s.role.startsWith("poster_"));
  // Files linked under a role the rules no longer list stay visible and editable.
  const extra: AssetSlot[] = [...byRole.keys()]
    .filter((role) => !rule.slots.some((s) => s.role === role))
    .map((role) => ({ role, label: FALLBACK_ROLE_LABELS[role] ?? role, hint: "현재 규칙에 없는 자료 종류입니다." }));

  const section = (slot: AssetSlot) => (
    <SlotSection
      key={slot.role}
      slot={slot}
      assets={byRole.get(slot.role) ?? EMPTY}
      boardSlug={rule.slug}
      eventId={event.id}
      allowYoutube={CONTEST_BOARDS.has(rule.slug) && (slot.role === "award_doc" || slot.role === "slide")}
    />
  );

  async function deleteEvent() {
    const ok = await confirmDialog({
      title: "이 행사를 삭제할까요?",
      description: `"${event.title_ko}" 행사와 연결된 자료가 모두 사라집니다. 행사 정보는 되돌릴 수 없습니다.`,
      confirmLabel: "행사 삭제",
      tone: "danger",
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await postJson("/api/admin/events/delete", { id: event.id });
      location.href = `/admin-x7k3p9/resources/${rule.slug}`;
    } catch (error) {
      if (!(error instanceof SessionExpired)) toast(`삭제하지 못했습니다.\n${error instanceof Error ? error.message : String(error)}`, "error");
      setDeleting(false);
    }
  }

  return (
    <div className="grid gap-5">
      <EventMetaCard key={event.id} rule={rule} event={event} />

      <p className="text-sm text-slate-600">아래 칸들은 공개 화면에 나오는 순서와 모양 그대로입니다. 각 칸에 파일을 끌어 놓으면 바로 올라가고, 항목을 끌어서 순서를 바꿀 수 있습니다.</p>

      {posters.length ? <div className="grid gap-4 md:grid-cols-2">{posters.map(section)}</div> : null}
      {others.map(section)}
      {extra.map(section)}

      <Card
        tone="danger"
        className="mt-5"
        title="행사 삭제"
        description="행사와 연결된 모든 자료가 공개 화면과 관리 목록에서 사라집니다."
        actions={
          <Button variant="danger" onClick={deleteEvent} disabled={deleting} icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}>
            행사 삭제
          </Button>
        }
      />
    </div>
  );
}

const EMPTY: EventAssetRow[] = [];
