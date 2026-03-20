# Architecture — MuruAI

캔버스 기반 교육 자료 제작 에디터의 시스템 아키텍처.

## 전체 구조

```
┌──────────────────────────────────────────────────────────┐
│                     브라우저 (React 19)                    │
│                                                          │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌────────┐  │
│  │ 랜딩/홈   │  │  에디터    │  │ 대시보드  │  │ 관리자  │  │
│  │Pages     │  │ Canvas    │  │Dashboard │  │ Admin  │  │
│  └────┬─────┘  └─────┬─────┘  └────┬─────┘  └───┬────┘  │
│       │              │             │             │        │
│  ┌────┴──────────────┴─────────────┴─────────────┴────┐  │
│  │              Zustand + TanStack Query               │  │
│  └────┬──────────────┬─────────────┬─────────────┬────┘  │
│       │              │             │             │        │
│  ┌────┴──────────────┴─────────────┴─────────────┴────┐  │
│  │              Supabase Client (shared/api)           │  │
│  └────────────────────┬───────────────────────────────┘  │
│                       │                                  │
│  ┌────────────────────┴───────────────────────────────┐  │
│  │        GenAI Client (shared/api/genai.ts)           │  │
│  │   DEV: 직접 Gemini API  │  PROD: /api/genai/* 프록시 │  │
│  └────────────────────┬───────────────────────────────┘  │
└───────────────────────┼──────────────────────────────────┘
                        │
     ┌──────────┬───────┼───────┬──────────┐
     ▼          ▼       ▼       ▼          ▼
┌──────────┐ ┌──────┐ ┌────┐ ┌──────┐ ┌────────┐
│ Supabase │ │Vercel│ │Gem-│ │Cloud-│ │Sentry/ │
│ Auth/DB  │ │Srvls │ │ini │ │inary │ │Mixpanel│
│ Storage  │ │/api/*│ │API │ │ CDN  │ │Analytic│
└──────────┘ └──────┘ └────┘ └──────┘ └────────┘
```

## 레이어 구조

### 1. Pages (`src/pages/`)

라우트 레벨 진입점. 조합만 담당하고 로직은 hooks/model로 내린다.

| 경로 | 컴포넌트 | 설명 |
|------|----------|------|
| `/` | `HomePage` | 랜딩 페이지 (AI 감정추론 생성 진입) |
| `/dashboard` | `DashboardRoute` | 대시보드 (인증 필수) |
| `/design/:id` | `DesignPage` | 캔버스 에디터 |
| `/mydoc` | `MyDocPage` | 내 학습자료 |
| `/admin` | `AdminPage` | 관리자 (AdminGuard 보호) |
| `/admin/user-docs` | `AdminUserDocsPage` | 유저별 자료 열람 |

### 2. Features (`src/features/`)

도메인별 비즈니스 로직. feature 간 직접 import 금지.

- **editor/** — 캔버스 에디터 핵심 (680+ 파일)
- **home/** — 랜딩/대시보드 UI
- **admin/** — 관리자 대시보드, 크레딧 관리, 유저 관리
- **storybook/** — AI 스토리북 생성기

### 3. Shared (`src/shared/`)

모든 feature에서 사용하는 공용 코드. `features/` import 금지.

- **api/** — Supabase 클라이언트, GenAI 클라이언트, Cloudinary 유틸리티
- **store/** — 전역 스토어 (useAuthStore)
- **providers/** — AuthProvider
- **ui/** — 순수 UI 컴포넌트 (Button, BaseModal, ConfirmDialog 등)
- **utils/** — Sentry, Mixpanel, 트래킹, 폰트

## 상태 관리

```
┌─────────────────┐     ┌──────────────────┐
│   Zustand        │     │  TanStack Query  │
│  (클라이언트)     │     │  (서버 상태)      │
│                  │     │                  │
│  editorStore     │     │  useStudents()   │
│  sideBarStore    │     │  useEmotionPhotos │
│  tableStore      │     │  useAdminUsers() │
│  authStore       │     │                  │
│  elementPanel    │     │                  │
│  emotionScene    │     │                  │
└─────────────────┘     └──────────────────┘
```

- **Zustand**: selector 기반 구독 필수. 전체 스토어 구독 금지.
- **TanStack Query**: 정적 리소스는 `staleTime: Infinity`, 사용자 데이터는 기본 staleTime.

## 에디터 아키텍처

```
┌─────────────────────────────────────────────┐
│ DesignLayout                                 │
│ ┌───────┐ ┌─────────────────┐ ┌───────────┐│
│ │사이드바│ │   CanvasStage    │ │속성 패널  ││
│ │       │ │ ┌─────────────┐ │ │           ││
│ │메뉴   │ │ │DesignPaper  │ │ │ShapeProps ││
│ │목록   │ │ │ (A4 페이퍼) │ │ │TextProps  ││
│ │       │ │ │ elements[]  │ │ │LineProps  ││
│ │       │ │ └─────────────┘ │ │           ││
│ └───────┘ └─────────────────┘ └───────────┘│
│ ┌─────────────────────────────────────────┐│
│ │ BottomBar (페이지 썸네일 네비게이션)      ││
│ └─────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
```

### 핵심 데이터 모델

- **Page**: `{ id, pageNumber, templateId, orientation, elements[], background, rev }`
- **CanvasElement**: discriminated union (text, rect, roundRect, ellipse, line, arrow, aacCard, emotionCard, table 등)
- **canvas_data**: `user_made_n.canvas_data` (JSONB) — 에디터 전체 상태 직렬화

### 히스토리 (Undo/Redo)

PageDiff 기반 — 변경된 페이지의 before/after만 저장. 500ms 이내 연속 편집은 자동 병합.

## 인증 흐름

```
AuthProvider (앱 루트)
  → getSession() — 현재 세션 확인
  → setUser() + setLoading(false) — UI 즉시 렌더
  → loadUserRole() — 비동기로 role 조회 (lock 충돌 방지)
  → onAuthStateChange — 로그인/로그아웃 감지
```

- `user_profiles.role`: `"user"` | `"admin"` — DB 기반, 이메일 하드코딩 금지
- AdminGuard: `/admin/*` 경로 보호 — role 로딩 중 스피너, 비인증/비관리자 차단

## AI 생성 파이프라인

```
주제 입력
  → generateEmotionStory() — Gemini 2.5 Flash (텍스트)
  → buildEmotionStoryPages() — 페이지 조립 (랜딩: 10p, 에디터: 13p)
  → generateEmotionSceneImages() — Gemini 2.5 Flash Image (이미지)
  → Cloudinary 업로드 → 페이지에 히어로 이미지 패치
```

- 크레딧: 이미지 1장 = 1크레딧. `use_credits` RPC로 원자적 차감.
- 텍스트 생성은 무료.

## 이미지 처리 (Cloudinary)

```
사용자 업로드 / AI 생성
  → Cloudinary unsigned upload (shared/api/cloudinary.ts)
  → CDN URL 반환 → 요소의 fill 속성에 저장
  → calculateCoverImageBox() — CSS object-fit: cover 계산
  → imageBox에 위치/크기 저장
```

- **업로드 경로**: `muru_uploads/{userId}` (사용자), `muru_emotion_scene/{userId}` (AI 장면)
- **지원 포맷**: JPEG, PNG, SVG
- **캔버스 드롭**: 로컬 프리뷰 즉시 표시 → 백그라운드 Cloudinary 업로드 → URL 교체
- **CDN 폰트 호스팅**: 184개 CDN 폰트를 Cloudinary에서 서빙
- **user_uploads_n 테이블**: 업로드 이력 추적

## PDF 출력

```
DesignLayout.generatePdf()
  → 배치별 5페이지 렌더 (pdfBatchPages)
  → html-to-image.toJpeg() 캡처
  → assemblePdf() — jsPDF로 조립
  → 빈 페이지 감지 (isLikelyBlankCapture)
```

- `html-to-image`만 사용 — `html2canvas` 금지
- DOM 보정 코드(`normalizePdfTextLayout` 등) 재도입 금지

## 외부 서비스

| 서비스 | 용도 | 인증 |
|--------|------|------|
| Supabase | Auth, DB, Storage, RLS | `VITE_SUPABASE_URL` + `PUBLISHABLE_KEY` |
| Google Gemini | AI 텍스트/이미지 생성 | DEV: `VITE_GOOGLE_API_KEY`, PROD: 서버 `GOOGLE_API_KEY` |
| Cloudinary | 이미지 업로드/변환/CDN, 폰트 호스팅 | `VITE_CLOUDINARY_CLOUD_NAME` (unsigned upload) |
| Sentry | 에러 추적 + 세션 리플레이 | `VITE_SENTRY_DSN` |
| Mixpanel | 사용자 행동 분석 | `VITE_MIXPANEL_TOKEN` |
| Vercel | 호스팅 + Serverless Functions | 자동 |
