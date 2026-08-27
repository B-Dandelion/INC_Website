# INC Website

INC 공식 웹사이트 프로젝트입니다.

## Development

```bash
npm install
npm run dev
```

## Environment

기존 Supabase / R2 / 관리자 환경변수 외에 회원 승인 결과 자동메일을 사용하려면 아래 값을 설정합니다.

```bash
RESEND_API_KEY=...
MEMBER_REVIEW_EMAIL_FROM="INC <verified-sender@example.com>"
MEMBER_REVIEW_REPLY_TO=inc@kings.ac.kr
NEXT_PUBLIC_SITE_URL=https://inc-kings.vercel.app
```

`RESEND_API_KEY` 또는 `MEMBER_REVIEW_EMAIL_FROM`이 없더라도 회원 승인/거부 처리는 정상 완료되며, 관리자 화면에는 메일 서비스 미설정 상태가 표시됩니다. 설정 후에는 승인/거부 시 결과 메일이 자동 발송되고, 실패한 메일은 회원 상세 화면에서 재전송할 수 있습니다.

## Admin

운영 관리자 화면은 `/admin-x7k3p9`에서 접근합니다.

- 자료실 관리
- 공지사항 관리
- 이벤트 관리
- 회원 관리

회원 관리에서는 관리자 및 관리 제외 계정을 노출하지 않으며, 일반 회원의 승인 대기 / 승인 완료 / 승인 거부 상태를 관리합니다.
