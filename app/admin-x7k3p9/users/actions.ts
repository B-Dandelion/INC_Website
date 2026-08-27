"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminOrThrow } from "@/lib/requireAdmin";
import { supabaseService } from "@/lib/supabaseServer";
import { sendMemberReviewEmail, type MemberReviewEmailResult } from "@/lib/memberReviewEmail";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ManageableMember = {
  id: string;
  role: string;
  approved: boolean;
  name: string | null;
  email: string | null;
  review_status: "pending" | "approved" | "rejected";
  hidden_from_member_management: boolean;
  rejection_reason: string | null;
};

function readId(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!UUID_RE.test(id)) throw new Error("올바르지 않은 회원 ID입니다.");
  return id;
}

function readReason(formData: FormData) {
  const value = String(formData.get("rejection_reason") ?? "").trim();
  if (value.length > 1000) throw new Error("승인 거부 사유는 1,000자 이내로 입력해 주세요.");
  return value || null;
}

async function requireManageableMember(id: string): Promise<ManageableMember> {
  const { data, error } = await supabaseService()
    .from("profiles")
    .select("id,role,approved,name,email,review_status,hidden_from_member_management,rejection_reason")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`회원 정보 확인 실패: ${error.message}`);
  if (!data) throw new Error("회원을 찾지 못했습니다.");
  if (data.role !== "member") throw new Error("관리자 계정은 회원 관리 화면에서 수정할 수 없습니다.");
  if (data.hidden_from_member_management) throw new Error("관리 제외 계정은 이 화면에서 수정할 수 없습니다.");
  return data as ManageableMember;
}

function refreshUsers() {
  revalidatePath("/admin-x7k3p9/users");
  revalidatePath("/pending");
}

async function memberEmail(member: ManageableMember) {
  if (member.email) return member.email;
  const { data } = await supabaseService().auth.admin.getUserById(member.id);
  return data?.user?.email ?? null;
}

async function recordMailResult(id: string, result: MemberReviewEmailResult) {
  const { error } = await supabaseService()
    .from("profiles")
    .update({
      review_notification_status: result.status,
      review_notification_sent_at: result.status === "sent" ? new Date().toISOString() : null,
      review_notification_error: result.error,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("role", "member");

  if (error) throw new Error(`메일 발송 결과 저장 실패: ${error.message}`);
}

async function sendReviewNotification(member: ManageableMember, kind: "approved" | "rejected", reason?: string | null) {
  const email = await memberEmail(member);
  const result: MemberReviewEmailResult = email
    ? await sendMemberReviewEmail({ to: email, name: member.name, kind, rejectionReason: reason })
    : { status: "failed", error: "회원 이메일 주소를 확인할 수 없습니다." };

  await recordMailResult(member.id, result);
  return result;
}

function redirectWithResult(status: string, mail?: MemberReviewEmailResult["status"]) {
  const params = new URLSearchParams({ status });
  if (mail) params.set("mail", mail);
  redirect(`/admin-x7k3p9/users?${params.toString()}`);
}

export async function approveMemberAction(formData: FormData) {
  await requireAdminOrThrow();
  const id = readId(formData);
  const member = await requireManageableMember(id);
  const now = new Date().toISOString();

  const { error } = await supabaseService()
    .from("profiles")
    .update({
      approved: true,
      review_status: "approved",
      rejection_reason: null,
      reviewed_at: now,
      review_notification_status: null,
      review_notification_sent_at: null,
      review_notification_error: null,
      updated_at: now,
    })
    .eq("id", id)
    .eq("role", "member")
    .eq("hidden_from_member_management", false);

  if (error) throw new Error(`회원 승인 실패: ${error.message}`);
  const mail = await sendReviewNotification({ ...member, approved: true, review_status: "approved", rejection_reason: null }, "approved");
  refreshUsers();
  redirectWithResult("approved", mail.status);
}

export async function rejectMemberAction(formData: FormData) {
  await requireAdminOrThrow();
  const id = readId(formData);
  const reason = readReason(formData);
  const member = await requireManageableMember(id);
  const now = new Date().toISOString();

  const { error } = await supabaseService()
    .from("profiles")
    .update({
      approved: false,
      review_status: "rejected",
      rejection_reason: reason,
      reviewed_at: now,
      review_notification_status: null,
      review_notification_sent_at: null,
      review_notification_error: null,
      updated_at: now,
    })
    .eq("id", id)
    .eq("role", "member")
    .eq("hidden_from_member_management", false);

  if (error) throw new Error(`회원 승인 거부 실패: ${error.message}`);
  const mail = await sendReviewNotification({ ...member, approved: false, review_status: "rejected", rejection_reason: reason }, "rejected", reason);
  refreshUsers();
  redirectWithResult("rejected", mail.status);
}

export async function revokeMemberApprovalAction(formData: FormData) {
  await requireAdminOrThrow();
  const id = readId(formData);
  await requireManageableMember(id);
  const now = new Date().toISOString();

  const { error } = await supabaseService()
    .from("profiles")
    .update({
      approved: false,
      review_status: "pending",
      rejection_reason: null,
      reviewed_at: now,
      review_notification_status: null,
      review_notification_sent_at: null,
      review_notification_error: null,
      updated_at: now,
    })
    .eq("id", id)
    .eq("role", "member")
    .eq("hidden_from_member_management", false);

  if (error) throw new Error(`승인 취소 실패: ${error.message}`);
  refreshUsers();
  redirectWithResult("revoked");
}

export async function resendReviewEmailAction(formData: FormData) {
  await requireAdminOrThrow();
  const id = readId(formData);
  const member = await requireManageableMember(id);

  if (member.review_status !== "approved" && member.review_status !== "rejected") {
    throw new Error("승인 완료 또는 승인 거부 회원에게만 결과 메일을 재전송할 수 있습니다.");
  }

  const result = await sendReviewNotification(
    member,
    member.review_status,
    member.review_status === "rejected" ? member.rejection_reason : null,
  );
  refreshUsers();
  redirectWithResult("resent", result.status);
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

  const { error: profileError } = await service
    .from("profiles")
    .delete()
    .eq("id", id)
    .eq("role", "member")
    .eq("hidden_from_member_management", false);
  if (profileError) throw new Error(`회원 프로필 정리 실패: ${profileError.message}`);

  refreshUsers();
  redirectWithResult("deleted");
}
