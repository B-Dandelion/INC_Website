"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminOrThrow } from "@/lib/requireAdmin";
import { supabaseService } from "@/lib/supabaseServer";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readId(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!UUID_RE.test(id)) throw new Error("올바르지 않은 회원 ID입니다.");
  return id;
}

async function requireManageableMember(id: string) {
  const { data, error } = await supabaseService()
    .from("profiles")
    .select("id, role")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`회원 정보 확인 실패: ${error.message}`);
  if (!data) throw new Error("회원을 찾지 못했습니다.");
  if (data.role !== "member") throw new Error("관리자 계정은 회원 관리 화면에서 수정할 수 없습니다.");
}

function refreshUsers() {
  revalidatePath("/admin-x7k3p9/users");
}

export async function approveMemberAction(formData: FormData) {
  await requireAdminOrThrow();
  const id = readId(formData);
  await requireManageableMember(id);

  const { error } = await supabaseService()
    .from("profiles")
    .update({ approved: true, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("role", "member");

  if (error) throw new Error(`회원 승인 실패: ${error.message}`);
  refreshUsers();
  redirect("/admin-x7k3p9/users?status=approved");
}

export async function revokeMemberApprovalAction(formData: FormData) {
  await requireAdminOrThrow();
  const id = readId(formData);
  await requireManageableMember(id);

  const { error } = await supabaseService()
    .from("profiles")
    .update({ approved: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("role", "member");

  if (error) throw new Error(`승인 취소 실패: ${error.message}`);
  refreshUsers();
  redirect("/admin-x7k3p9/users?status=revoked");
}

export async function deleteMemberAction(formData: FormData) {
  await requireAdminOrThrow();
  const id = readId(formData);
  await requireManageableMember(id);

  if (formData.get("confirm_delete") !== "on") {
    throw new Error("회원 삭제 확인을 체크한 뒤 다시 시도해 주세요.");
  }

  const service = supabaseService();
  const { error: authError } = await service.auth.admin.deleteUser(id);
  if (authError) throw new Error(`회원 계정 삭제 실패: ${authError.message}`);

  const { error: profileError } = await service.from("profiles").delete().eq("id", id).eq("role", "member");
  if (profileError) throw new Error(`회원 프로필 정리 실패: ${profileError.message}`);

  refreshUsers();
  redirect("/admin-x7k3p9/users?status=deleted");
}
