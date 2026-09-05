# INC Website

> 기관의 발간물·세미나·워크숍·보고서 등 다양한 콘텐츠를 한곳에서 관리하고 공개 범위에 따라 제공하는 **권한 기반 콘텐츠 아카이브 웹사이트**입니다.

[Live Site](https://inc-kings.vercel.app/) · [Repository](https://github.com/B-Dandelion/INC_Website)

![INC Website](./public/hero_kings_overlay_1920x800.jpg)

## Project Overview

INC Website는 여러 경로에 흩어져 있던 자료를 게시판과 카테고리 단위로 정리하고, 관리자가 직접 업로드·수정·공개 범위를 관리할 수 있도록 구축한 웹 서비스입니다.

요구사항 정리 이후 **웹 애플리케이션 구조 설계, 프론트엔드·서버 API 구현, 데이터 구조와 권한 설계, 파일 저장소 연동, 기존 자료 이관, 배포까지 1인 개발**로 진행했습니다.

단순한 정적 홈페이지보다 다음 문제를 해결하는 데 초점을 맞췄습니다.

- 자료의 메타데이터와 실제 파일을 역할에 맞게 분리해 저장하기
- `public / member / admin` 공개 범위에 따라 접근 경계를 유지하기
- 관리자 업로드 과정에서 DB와 Object Storage의 상태가 어긋나지 않게 하기
- 기존 다량의 자료를 반복 가능한 스크립트로 이관하기
- 실제 배포 환경에서 인증·관리자 기능·자료 조회를 함께 운영하기

## Architecture

```text
User / Admin
    │
    ▼
Next.js App Router
    │
    ├─ Auth / Metadata / Visibility ── Supabase
    │                                  ├─ Auth
    │                                  └─ PostgreSQL
    │
    └─ File Upload / Download ──────── Cloudflare R2
                                       ├─ Public Bucket
                                       └─ Private Bucket

Deployment: Vercel
Member Review Email: Resend
```

### Storage Boundary

웹에서 조회하는 자료 정보와 실제 파일을 분리했습니다.

- **PostgreSQL**: 제목, 게시판, 게시일, 공개 범위, 파일 정보, `r2_key` 등 메타데이터
- **Cloudflare R2**: PDF·이미지·영상·문서 등 실제 파일
- **Supabase Auth**: 사용자 인증
- **Server API**: 관리자 권한 검증, 업로드 입력 검증, 저장·조회 흐름 제어

이 구조를 통해 대용량 파일 저장과 관계형 데이터 조회의 책임을 나누고, 공개 범위에 따라 public/private bucket을 선택하도록 구성했습니다.

## Key Engineering Points

### 1. 권한 기반 자료 관리

자료마다 `public / member / admin` 공개 범위를 두고, 관리자 API에서는 요청 처리 전에 권한을 확인합니다.

자료 조회 시에도 공개 범위, 삭제 상태, 게시판, 검색어, 날짜, 페이지네이션 등의 조건을 서버 쿼리에 반영해 필요한 데이터만 조회하도록 구성했습니다.

```text
Request
  → Admin authorization
  → Input validation
  → Storage / DB operation
  → Response
```

### 2. Object Storage와 DB 사이의 실패 처리

파일 저장과 메타데이터 저장은 서로 다른 시스템에서 일어나기 때문에 한쪽만 성공하면 데이터 불일치가 발생할 수 있습니다.

관리자 업로드 API에서는 R2 업로드 후 PostgreSQL의 `resources` INSERT가 실패하면 이미 저장된 객체를 다시 삭제합니다.

```text
PutObject  ✓
    │
    ▼
DB INSERT  ✕
    │
    ▼
DeleteObject rollback
```

이를 통해 **DB에는 자료가 없지만 Storage에는 파일만 남는 고립 상태**를 방지했습니다.

관련 구현: `app/api/admin/upload/route.ts`

### 3. 게시판별 조회 규칙과 콘텐츠 구조

발간물·세미나·워크숍·보고서·공모전 등 서로 다른 자료 유형을 하나의 자료실 구조에서 다루되, 각 게시판 특성에 맞는 정렬·검색·하위 분류를 지원하도록 구성했습니다.

주요 구현 범위:

- 게시판별 자료 목록 및 상세 조회
- 검색 / 날짜 / 게시판 필터
- 페이지네이션
- 계층형 자료 분류
- 공개/회원/관리자 자료 구분
- 관리자 자료 등록·수정·삭제
- 파일 및 YouTube URL 등록
- 공지·행사·회원 관리

### 4. 기존 자료 이관 자동화

기존 자료를 새 구조로 이전하면서 반복 업로드를 수작업으로 처리하지 않고, 파일 정보와 날짜·카테고리 메타데이터를 정리한 뒤 **R2 업로드 + PostgreSQL 등록 과정을 스크립트화**했습니다.

`scripts/`에는 자료 이관과 R2 동작 확인을 위한 스크립트가 포함되어 있습니다.

## Tech Stack

| Area | Technology |
| --- | --- |
| Frontend / Server | Next.js App Router, React, TypeScript |
| Database / Auth | Supabase PostgreSQL, Supabase Auth |
| Object Storage | Cloudflare R2, AWS S3 SDK |
| Email | Resend |
| Deployment | Vercel |
| Other | Vercel Analytics, Recharts |

## Main Structure

```text
INC_Website/
├─ app/
│  ├─ api/                  # public/admin server routes
│  ├─ resources/            # content archive pages
│  ├─ events/               # event pages
│  ├─ notice/               # notices
│  ├─ auth/                 # login / signup
│  └─ admin-x7k3p9/         # admin UI
├─ components/
│  ├─ admin/
│  ├─ home/
│  └─ resources/
├─ lib/                     # auth, DB access, resource/domain helpers
├─ public/
└─ scripts/                 # data migration / R2 utilities
```

## Local Development

```bash
npm install
npm run dev
```

개발 서버는 기본적으로 `http://localhost:3000`에서 실행됩니다.

필요한 외부 서비스 값은 로컬 또는 배포 환경변수로 설정해야 합니다. 실제 키와 비밀값은 저장소에 포함하지 않습니다.

주요 환경변수 예시:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Cloudflare R2
R2_ENDPOINT=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_PUBLIC_BUCKET=
R2_PRIVATE_BUCKET=

# Member review email
RESEND_API_KEY=
MEMBER_REVIEW_EMAIL_FROM=
MEMBER_REVIEW_REPLY_TO=
NEXT_PUBLIC_SITE_URL=https://inc-kings.vercel.app
```

> 환경변수 이름은 실행 환경과 기능에 따라 추가될 수 있습니다.

## Notes

- 실제 운영을 목적으로 제작된 웹 서비스입니다.
- 공개 저장소에는 서비스 운영에 필요한 비밀키·개인정보·원본 비공개 자료를 포함하지 않습니다.
- 자료의 공개 범위와 저장 위치를 분리하고, 실패 시 상태 일관성을 유지하는 서버 로직을 중점적으로 설계했습니다.

## Developer

**Jin Minkyoung · 1-person development**

- Web application architecture
- Frontend / backend implementation
- Database & authorization design
- Object storage integration
- Data migration
- Deployment & maintenance
