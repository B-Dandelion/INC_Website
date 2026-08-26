"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminOrThrow } from "@/lib/requireAdmin";
import { supabaseService } from "@/lib/supabaseServer";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(formData: FormData, key: string) {
  const value = readText(formData, key);
  return value || null;
}

function readId(formData: FormData) {
  const id = readText(formData, "id");
  if (!UUID_RE.test(id)) throw new Error("올바르지 않은 이벤트 ID입니다.");
  return id;
}

function validateDate(value: string | null, label: string) {
  if (!value) return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${label} 형식이 올바르지 않습니다.`);
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`${label}이 올바르지 않습니다.`);
  }
}

function validateTime(value: string | null, label: string) {
  if (!value) return;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error(`${label} 형식이 올바르지 않습니다.`);
}

function validateCtaUrl(value: string | null) {
  if (!value) return;
  if (value.startsWith("/")) return;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
  } catch {
    throw new Error("연결 주소는 /로 시작하는 내부 주소 또는 http(s) 주소여야 합니다.");
  }
}

function readEventFields(formData: FormData) {
  const title = readText(formData, "title_ko");
  const summary = optionalText(formData, "summary_ko");
  const content = optionalText(formData, "content_ko");
  const eventDate = optionalText(formData, "event_date");
  const periodEnd = optionalText(formData, "period_end");
  const startTime = optionalText(formData, "start_time");
  const endTime = optionalText(formData, "end_time");
  const location = optionalText(formData, "location_ko");
  const audience = optionalText(formData, "audience_ko");
  const contactName = optionalText(formData, "contact_name");
  const contactEmail = optionalText(formData, "contact_email");
  const contactPhone = optionalText(formData, "contact_phone");
  const ctaLabel = optionalText(formData, "cta_label");
  const ctaUrl = optionalText(formData, "cta_url");
  const featured = formData.get("homepage_featured") === "on";
  const visibility = formData.get("visibility_public") === "on" ? "public" : "private";

  if (!title) throw new Error("이벤트 제목을 입력해 주세요.");
  if (title.length > 200) throw new Error("이벤트 제목은 200자 이내로 입력해 주세요.");
  if (summary && summary.length > 500) throw new Error("요약은 500자 이내로 입력해 주세요.");
  if (content && content.length > 20_000) throw new Error("상세 내용은 20,000자 이내로 입력해 주세요.");
  if (location && location.length > 300) throw new Error("장소는 300자 이내로 입력해 주세요.");
  if (ctaLabel && ctaLabel.length > 100) throw new Error("버튼 문구는 100자 이내로 입력해 주세요.");

  validateDate(eventDate, "시작일");
  validateDate(periodEnd, "종료일");
  validateTime(startTime, "시작 시간");
  validateTime(endTime, "종료 시간");
  validateCtaUrl(ctaUrl);

  if (eventDate && periodEnd && periodEnd < eventDate) {
    throw new Error("종료일은 시작일보다 빠를 수 없습니다.");
  }

  return {
    category: "promotion",
    subtype: null,
    series_year: eventDate ? Number(eventDate.slice(0, 4)) : null,
    title_ko: title,
    summary_ko: summary,
    content_ko: content,
    event_date: eventDate,
    period_end: periodEnd,
    start_time: startTime,
    end_time: endTime,
    location_ko: location,
    audience_ko: audience,
    contact_name: contactName,
    contact_email: contactEmail,
    contact_phone: contactPhone,
    cta_label: ctaLabel,
    cta_url: ctaUrl,
    homepage_featured: featured,
    visibility,
  };
}

function refreshEventPages(id?: string) {
  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath("/events/[id]", "page");
  if (id) revalidatePath(`/events/${id}`);
  revalidatePath("/admin-x7k3p9/events");
}

async function unfeatureOthers(id: string) {
  const { error } = await supabaseService()
    .from("events")
    .update({ homepage_featured: false })
    .eq("category", "promotion")
    .neq("id", id)
    .eq("homepage_featured", true);

  if (error) throw new Error(`메인 홍보 상태 정리 실패: ${error.message}`);
}

export async function createPromotionEventAction(formData: FormData) {
  await requireAdminOrThrow();
  const payload = readEventFields(formData);

  const { data, error } = await supabaseService()
    .from("events")
    .insert(payload)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(`이벤트 등록 실패: ${error.message}`);
  if (!data?.id) throw new Error("등록된 이벤트 ID를 확인하지 못했습니다.");

  if (payload.homepage_featured) await unfeatureOthers(data.id);

  refreshEventPages(data.id);
  redirect("/admin-x7k3p9/events?status=created");
}

export async function updatePromotionEventAction(formData: FormData) {
  await requireAdminOrThrow();
  const id = readId(formData);
  const payload = readEventFields(formData);

  const { data, error } = await supabaseService()
    .from("events")
    .update(payload)
    .eq("id", id)
    .eq("category", "promotion")
    .select("id")
    .maybeSingle();

  if (error) throw new Error(`이벤트 수정 실패: ${error.message}`);
  if (!data) throw new Error("수정할 이벤트를 찾지 못했습니다.");

  if (payload.homepage_featured) await unfeatureOthers(id);

  refreshEventPages(id);
  redirect("/admin-x7k3p9/events?status=updated");
}

export async function deletePromotionEventAction(formData: FormData) {
  await requireAdminOrThrow();
  const id = readId(formData);
  if (formData.get("confirm_delete") !== "on") {
    throw new Error("삭제 확인을 체크한 뒤 다시 시도해 주세요.");
  }

  const { data, error } = await supabaseService()
    .from("events")
    .delete()
    .eq("id", id)
    .eq("category", "promotion")
    .select("id")
    .maybeSingle();

  if (error) throw new Error(`이벤트 삭제 실패: ${error.message}`);
  if (!data) throw new Error("삭제할 이벤트를 찾지 못했습니다.");

  refreshEventPages(id);
  redirect("/admin-x7k3p9/events?status=deleted");
}
