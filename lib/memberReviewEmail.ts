type ReviewEmailKind = "approved" | "rejected";

type SendMemberReviewEmailArgs = {
  to: string;
  name?: string | null;
  kind: ReviewEmailKind;
  rejectionReason?: string | null;
};

export type MemberReviewEmailResult = {
  status: "sent" | "failed" | "not_configured";
  error: string | null;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://inc-kings.vercel.app").replace(/\/$/, "");
}

function buildEmail(args: SendMemberReviewEmailArgs) {
  const displayName = (args.name || "회원").trim() || "회원";
  const loginUrl = `${siteUrl()}/login`;

  if (args.kind === "approved") {
    return {
      subject: "[INC] 회원 가입이 승인되었습니다",
      text: `${displayName}님, INC 회원 가입이 승인되었습니다.\n\n로그인 후 회원 전용 자료를 이용하실 수 있습니다.\n${loginUrl}\n\n본 메일은 발신 전용 안내 메일입니다.`,
      html: `
        <div style="font-family:Arial,'Noto Sans KR',sans-serif;line-height:1.7;color:#172033;max-width:620px;margin:0 auto;padding:28px">
          <div style="font-size:12px;font-weight:700;letter-spacing:.14em;color:#2B6CA3">INC MEMBER NOTICE</div>
          <h1 style="font-size:24px;margin:10px 0 18px">회원 가입이 승인되었습니다.</h1>
          <p>${escapeHtml(displayName)}님, INC 회원 가입 승인이 완료되었습니다.</p>
          <p>이제 로그인 후 회원 전용 자료를 이용하실 수 있습니다.</p>
          <p style="margin:28px 0"><a href="${loginUrl}" style="display:inline-block;background:#174A7E;color:#fff;text-decoration:none;padding:11px 18px;border-radius:5px;font-weight:700">INC 로그인</a></p>
          <p style="font-size:12px;color:#788397;border-top:1px solid #E3E8EF;padding-top:18px">본 메일은 회원 승인 결과를 안내하기 위해 자동 발송되었습니다.</p>
        </div>`,
    };
  }

  const reason = (args.rejectionReason || "별도 사유 없음").trim() || "별도 사유 없음";
  return {
    subject: "[INC] 회원 가입 승인 결과 안내",
    text: `${displayName}님, INC 회원 가입 승인 요청이 승인되지 않았습니다.\n\n사유: ${reason}\n\n추가 문의가 필요한 경우 INC 대표 연락처를 이용해 주세요.\n${siteUrl()}/contact\n\n본 메일은 발신 전용 안내 메일입니다.`,
    html: `
      <div style="font-family:Arial,'Noto Sans KR',sans-serif;line-height:1.7;color:#172033;max-width:620px;margin:0 auto;padding:28px">
        <div style="font-size:12px;font-weight:700;letter-spacing:.14em;color:#2B6CA3">INC MEMBER NOTICE</div>
        <h1 style="font-size:24px;margin:10px 0 18px">회원 가입 승인 결과 안내</h1>
        <p>${escapeHtml(displayName)}님, INC 회원 가입 승인 요청이 승인되지 않았습니다.</p>
        <div style="margin:20px 0;padding:14px 16px;background:#F6F7F9;border-left:3px solid #9AA7B7"><strong>사유</strong><br>${escapeHtml(reason)}</div>
        <p>추가 문의가 필요한 경우 INC 대표 연락처를 이용해 주세요.</p>
        <p style="margin:24px 0"><a href="${siteUrl()}/contact" style="color:#174A7E;font-weight:700">INC 문의 페이지</a></p>
        <p style="font-size:12px;color:#788397;border-top:1px solid #E3E8EF;padding-top:18px">본 메일은 회원 승인 결과를 안내하기 위해 자동 발송되었습니다.</p>
      </div>`,
  };
}

export async function sendMemberReviewEmail(args: SendMemberReviewEmailArgs): Promise<MemberReviewEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MEMBER_REVIEW_EMAIL_FROM;
  const replyTo = process.env.MEMBER_REVIEW_REPLY_TO;

  if (!apiKey || !from) {
    return {
      status: "not_configured",
      error: "메일 발송 환경변수(RESEND_API_KEY, MEMBER_REVIEW_EMAIL_FROM)가 설정되지 않았습니다.",
    };
  }

  const message = buildEmail(args);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [args.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return {
        status: "failed",
        error: `메일 발송 실패 (HTTP ${response.status})${body ? `: ${body.slice(0, 300)}` : ""}`,
      };
    }

    return { status: "sent", error: null };
  } catch (error) {
    return {
      status: "failed",
      error: error instanceof Error ? error.message : "메일 발송 중 알 수 없는 오류가 발생했습니다.",
    };
  }
}
