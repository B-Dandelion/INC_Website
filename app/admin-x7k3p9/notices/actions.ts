"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminOrThrow } from "@/lib/requireAdmin";
import { supabaseService } from "@/lib/supabaseServer";

const MAX_TITLE_LENGTH = 200;
const MAX_CONTENT_LENGTH = 20_000;

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readId(formData: FormData) {
  const id = Number(readText(formData, "id"));
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("올바르지 않은 공지사항 ID입니다.");
  }
  return id;
}

function validateDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("게시일 형식이 올바르지 않습니다.");
  }

  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error("존재하지 않는 게시일입니다.");
  }
}

function readNoticeFields(formData: FormData) {
  const title = readText(formData, "title");
  const content = readText(formData, "content");
  const postedAt = readText(formData, "posted_at");
  const pinned = formData.get("pinned") === "on";

  if (!title) throw new Error("제목을 입력해 주세요.");
  if (!content) throw new Error("내용을 입력해 주세요.");
  if (title.length > MAX_TITLE_LENGTH) {
    throw new Error(`제목은 ${MAX_TITLE_LENGTH}자 이내로 입력해 주세요.`);
  }
  if (content.length > MAX_CONTENT_LENGTH) {
    throw new Error(`내용은 ${MAX_CONTENT_LENGTH.toLocaleString()}자 이내로 입력해 주세요.`);
  }
  validateDate(postedAt);

  return {
    title,
    content,
    posted_at: postedAt,
    pinned,
  };
}

function refreshNoticePages() {
  revalidatePath("/");
  revalidatePath("/notice");
  revalidatePath("/notice/[id]", "page");
  revalidatePath("/admin-x7k3p9/notices");
}

export async function createNoticeAction(formData: FormData) {
  await requireAdminOrThrow();
  const payload = readNoticeFields(formData);

  const { error } = await supabaseService()
    .from("notices")
    .insert({ ...payload, visibility: "public" });

  if (error) throw new Error(`공지사항 등록 실패: ${error.message}`);

  refreshNoticePages();
  redirect("/admin-x7k3p9/notices?status=created");
}

export async function updateNoticeAction(formData: FormData) {
  await requireAdminOrThrow();
  const id = readId(formData);
  const payload = readNoticeFields(formData);

  const { data, error } = await supabaseService()
    .from("notices")
    .update(payload)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(`공지사항 수정 실패: ${error.message}`);
  if (!data) throw new Error("수정할 공지사항을 찾지 못했습니다.");

  refreshNoticePages();
  redirect("/admin-x7k3p9/notices?status=updated");
}

export async function deleteNoticeAction(formData: FormData) {
  await requireAdminOrThrow();
  const id = readId(formData);
  const confirmed = formData.get("confirm_delete") === "on";

  if (!confirmed) {
    throw new Error("삭제 확인을 체크한 뒤 다시 시도해 주세요.");
  }

  const { data, error } = await supabaseService()
    .from("notices")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(`공지사항 삭제 실패: ${error.message}`);
  if (!data) throw new Error("삭제할 공지사항을 찾지 못했습니다.");

  refreshNoticePages();
  redirect("/admin-x7k3p9/notices?status=deleted");
}
