# CLAUDE.md

MuruAI: 교육 자료 제작을 위한 캔버스 기반 디자인 에디터 (React 19, TypeScript, Vite, Zustand, Supabase)

## 명령어

```bash
yarn dev              # 개발 서버 시작
yarn build            # TypeScript 검사 + Vite 빌드
yarn typecheck        # TypeScript 타입 검사만 (tsc -b --noEmit)
yarn lint             # ESLint + TypeScript 검사
yarn preview          # 프로덕션 빌드 미리보기
yarn generate:fonts   # CDN 폰트 레지스트리 재생성 (batch/font-map.json → cdnFontRegistry.ts)
```

## 아키텍처

### 폴더 구조

```
src/
  app/              # 엔트리, 라우팅 (Router.tsx), 레이아웃, 전역 Provider
  shared/           # 공용 유틸 — features/를 절대 import하지 않음
    api/            # Supabase 클라이언트, Cloudinary 유틸리티
    ui/             # 순수 UI 컴포넌트 (비즈니스 로직 금지)
    hooks/          # 범용 훅 (useAuth)
    utils/          # 유틸리티 (initSentry, initMixpanel, trackEvents)
    providers/      # 전역 Provider (AuthProvider)
    store/          # 전역 스토어 (useAuthStore)
    assets/         # 이미지, 아이콘
  features/
    editor/         # 핵심 디자인 에디터
    home/           # 홈 페이지
    admin/          # 관리자 대시보드
    studio/         # AI 치료 활동 생성기 (/studio)
  pages/            # 라우트 레벨 페이지
```

### 의존성 규칙

- `shared/*` → `features/*` import 금지
- `features/A` → `features/B` 직접 import 금지 (shared로 승격하거나 상위에서 조합)
- Page 컴포넌트는 조합만 담당, 로직은 hooks/model로 내림

### 핵심 도구

- **React Compiler** 사용 — 불필요한 `useMemo`/`useCallback` 금지 (명확한 성능 근거가 있을 때만 허용)
- **Zustand** selector 기반 구독 필수 (상세: `.claude/rules/zustand.md`)
- **경로 별칭**: `@/` → `src/` (vite.config.ts)

## 주요 진입 파일

- 엔트리: `src/main.tsx`
- 라우터: `src/app/config/Router.tsx`
- Supabase 클라이언트: `src/shared/api/supabase.ts`
- 메인 에디터: `src/pages/editor/DesignPage.tsx`

## 환경 변수

필수 (`VITE_` 접두사):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

## 코딩 컨벤션

- Feature-first 구조 유지, Tailwind CSS v4, Lucide React 아이콘
- TanStack Query = 서버 상태, Zustand = 클라이언트 상태
- import 순서: 외부 라이브러리 → `@/` 경로 → 상대 경로 (상세: `.claude/rules/code-style.md`)
- type import에 `type` 키워드 사용: `import type { Foo } from './types'`
- 네이밍: 컴포넌트 `PascalCase`, 훅 `use*`, 핸들러 `handle*`, 상수 `SCREAMING_SNAKE_CASE`
- boolean 변수: `is`/`has`/`should` 접두사

## 실수 방지 (Gotchas)

1. **의존성 방향**: `shared/` → `features/` import 절대 금지. `features/A` → `features/B` 직접 import 금지
2. **Zustand**: 전체 스토어 구독 금지 — `useStore((s) => s.field)` selector만 사용
3. **React Compiler**: 불필요한 `useMemo`/`useCallback` 금지
4. **ID 생성**: `crypto.randomUUID()` 통일 — `Date.now()` 기반 ID 금지
5. **Supabase 소프트 삭제**: `deleted_at` 컬럼이 있는 테이블 조회 시 `.is("deleted_at", null)` 필수
6. **Supabase 소유권**: 사용자 데이터 조회/수정 시 `.eq("user_id", userId)` 또는 `.eq("owner_id", userId)` 필수
7. **PDF 렌더링**: `html-to-image`만 사용 — `html2canvas` 금지 (flex/폰트 오차 발생)
8. **PDF DOM 보정**: `normalizePdfTextLayout`, `normalizePdfElementCapturePosition`, `buildScaleFallbacks` 같은 DOM 보정 코드 재도입 금지
9. **Mixpanel**: `mp` 래퍼만 사용 (`import { mp } from "@/shared/utils/mixpanel"`) — `mixpanel-browser` 직접 import 금지
10. **이벤트 추적**: DB 이벤트(`trackEvents.ts`)는 비차단 패턴 필수 (`void` + `console.warn`, `await` 금지)
11. **사이드바 탭 추가**: `SideBarMenu` 타입 + `MENU_LABELS` + `MENU_ITEMS` + `CONTENT_COMPONENTS` 4곳 동시 수정 필수
12. **CDN 폰트**: CDN 폰트 선택/사용 시 `loadCdnFont()` 호출 필수 — 로드 후 적용. `cdnFontRegistry.ts`는 자동 생성 파일이므로 직접 수정 금지 (`yarn generate:fonts`로 재생성)
13. **AI 이미지 크레딧**: 기본 30크레딧. `user_credits.balance`로 잔량 추적, `use_credits` RPC로 원자적 차감 (이미지 1장 = 1크레딧, 텍스트 무료). 크레딧 소진 시 `ai_credit_requests`로 추가 요청 → 관리자 승인 시 `balance += 30` 누적 충전 (기존 잔량 유지). 재요청 차단은 **pending 상태 요청이 있을 때만** — 승인/거절 후에는 다시 요청 가능 (`hasPendingCreditRequest`). `ai_template_usage` 테이블은 생성 이력 기록용으로 유지
14. **GenAI 클라이언트**: `getGenAI()` 사용 (`src/shared/api/genai.ts`) — 개발 모드(`VITE_GOOGLE_API_KEY` + `import.meta.env.DEV`)에서는 브라우저 직접 호출, 프로덕션에서는 `/api/genai/*` 서버 프록시 경유. Vertex AI 사용 금지
15. **이메일 회원가입 비활성화**: `AuthModal.tsx`에서 회원가입 UI 주석 처리됨. 소셜 로그인(Google/카카오) + 이메일 로그인만 활성. 복원 시 `이메일 회원가입 임시 비활성화` 키워드로 검색
16. **Sentry 에러 캡처**: `captureSentryError(error, "컨텍스트")` 헬퍼 필수 사용 (`sentryUtils.ts`) — `Sentry.captureException` 직접 호출 금지 (Supabase 에러 객체 비호환)
17. **선그림 탭 비활성화**: `EmotionContent.tsx`에서 선그림 TypeButton + ComingSoon 주석 처리됨. 복원 시 `선그림 임시 비활성화` 키워드로 검색
18. **네트워크 끊김 배너**: 자동 저장 `Failed to fetch` 또는 브라우저 `offline` 이벤트 시 에디터 상단에 오프라인 배너 표시. `online` 이벤트로 자동 사라짐. 네트워크 에러는 Sentry 전송 스킵
19. **AI 생성 로그 추적**: `trackAiGeneration.ts` 함수는 비차단 패턴 (`console.warn`). `ai_generation_logs` 테이블에 4단계 기록 (상세: `.claude/rules/common/ai-generation-logging.md`)
20. **간격은 padding + gap 우선**: 요소 간 간격에 `margin` 대신 부모 `gap` 또는 `padding` 사용 (상세: `.claude/rules/common/design-system.md` 항목 10)
21. **타이포그래피 클래스 확인 필수**: `global.css`에 정의된 클래스만 사용. `text-13-semibold`(미존재) → `text-13-bold`, `text-12-bold`(미존재) → `text-12-semibold`
22. **관리자 인증**: `user_profiles.role === "admin"` 기반 — 이메일 하드코딩(`ADMIN_EMAIL`) 금지. `AuthProvider`가 로그인 시 role 조회 → `useAuthStore.setRole()`. 헤더에서 `role === "admin"` 시 "관리자" 버튼 표시
23. **로고 이미지**: `public/main_logo.png` 고정 경로 사용 — Vite 빌드 해시가 붙는 `src/shared/assets/logo/` import 금지 (`canvas_data`에 저장 시 빌드마다 URL이 변경되어 기존 문서에서 로고가 깨짐). 문서 로드 시 `migrateLogoFill()`로 기존 해시 URL을 고정 URL로 자동 교체
24. **포커스 모드 초기화**: 문서 전환 시 `aiGenerationModeStore.exitFocusedMode()` + 사이드바 `"template"` 전환 필수 — `useDocumentLoader`에서 `focusedAiMode` 메타가 없으면 자동 초기화
25. **Studio 도메인 레퍼런스**: `api/_lib/studio/refs/` 파일은 서버 전용 — 클라이언트에서 직접 import 금지. `anonymizeForLLM()`으로 PII 제거 후 API 호출 필수
26. **Studio 접근 제어**: `/studio` 경로는 `role === "tester" || role === "admin"` 만 접근 가능. `UserRole` 타입에 `"tester"` 포함. 에디터 사이드바 치료 탭도 동일 조건
27. **Studio 크레딧 미적용**: 치료 AI 사용에 크레딧을 차감하지 않음. 기존 크레딧 시스템 건드리지 않음
28. **Studio 기존 영향 금지**: `shared/` 오염 금지 (`useAuthStore` UserRole 확장만 예외), 기존 API 엔드포인트 변경 금지

## 지침 모듈화 원칙

- 지침은 단일 문서에 과도하게 집중시키지 않는다. 주제 경계가 명확해지면 즉시 분리한다.
- 루트 문서(`CLAUDE.md`)는 공통 원칙/우선순위/링크 중심으로 유지한다.
- 분리된 문서는 담당 범위를 파일 상단에 명확히 쓰고, 상호 참조 링크를 포함해야 한다.
- 신규 요구사항 추가 시 기존 문서에 억지로 덧붙이지 말고, 적절하면 새 문서를 생성한다.
- 7~20줄 이하의 마이크로 섹션은 관련 주제끼리 묶어 하나의 문서로 관리한다 (파일 수 폭증 방지).

## 도메인별 상세 지침

### 공통 (`rules/common/`)

| 도메인                     | 규칙 파일                               |
| -------------------------- | --------------------------------------- |
| 코드 스타일                | `.claude/rules/common/code-style.md`    |
| Zustand                    | `.claude/rules/common/zustand.md`       |
| 반응형 UI                  | `.claude/rules/common/responsive.md`    |
| 디자인 시스템              | `.claude/rules/common/design-system.md` |
| DB/Supabase                | `.claude/rules/common/database.md`      |
| 모니터링 (Sentry/Mixpanel) | `.claude/rules/common/monitoring.md`    |
| shared 모듈                | `.claude/rules/common/shared.md`        |
| 폰트 시스템                | `.claude/rules/common/font.md`          |
| AI 생성 로그 추적          | `.claude/rules/common/ai-generation-logging.md` |

### 에디터 (`rules/editor/`)

| 도메인               | 규칙 파일                                        |
| -------------------- | ------------------------------------------------ |
| 에디터 전반          | `.claude/rules/editor/editor.md`                 |
| 에디터 기능별 상세   | `.claude/rules/editor/editor-features.md`        |
| 에디터 사이드바 패널 | `.claude/rules/editor/editor-sidebar-panel.md`   |
| 캔버스 아키텍처      | `.claude/rules/editor/canvas-architecture.md`    |
| 캔버스 인터랙션      | `.claude/rules/editor/canvas-interaction.md`     |
| 히스토리/Undo-Redo   | `.claude/rules/editor/history-undo.md`           |
| 구독 패턴            | `.claude/rules/editor/subscriptions.md`          |
| 요소 패널 스토어     | `.claude/rules/editor/element-panel-store.md`    |
| 복사/붙여넣기        | `.claude/rules/editor/copy-paste.md`             |
| 스마트 가이드        | `.claude/rules/editor/smart-guides.md`           |
| 하단 바              | `.claude/rules/editor/bottom-bar.md`             |
| PDF 출력             | `.claude/rules/editor/pdf-export.md`             |
| 페이지 팩토리/템플릿 | `.claude/rules/editor/page-factory-templates.md` |
| 이미지 채우기 시스템 | `.claude/rules/editor/image-fill-system.md`      |
| 맞춤법 검사          | `.claude/rules/editor/spell-check.md`            |

### 에디터 요소 (`rules/editor/elements/`)

| 도메인         | 규칙 파일                                              |
| -------------- | ------------------------------------------------------ |
| 도형 요소      | `.claude/rules/editor/elements/shape-elements.md`      |
| TextBox        | `.claude/rules/editor/elements/textbox.md`             |
| Table          | `.claude/rules/editor/elements/table.md`               |
| 선/화살표 요소 | `.claude/rules/editor/elements/line-arrow-elements.md` |
| AAC 카드 요소  | `.claude/rules/editor/elements/aac-card-element.md`    |

### AI 기능 (`rules/ai/`)

| 도메인             | 규칙 파일                                             |
| ------------------ | ----------------------------------------------------- |
| AI 감정 추론 생성  | `.claude/rules/ai/emotion-inference-ai-generation.md` |
| 스토리북 AI 생성기 | `.claude/rules/ai/storybook.md`                       |
| AI 치료 활동 (Studio) | `.claude/rules/ai/studio.md`                       |
| AI 이미지 소재 생성 (Image-Gen) | `.claude/rules/ai/image-gen.md`          |

### 페이지 (`rules/pages/`)

| 도메인   | 규칙 파일                                                         |
| -------- | ----------------------------------------------------------------- |
| 홈페이지       | `.claude/rules/pages/home-page.md`, `.claude/rules/pages/home.md` |
| 메인 페이지    | `.claude/rules/pages/landing.md`                                  |
| 내 문서        | `.claude/rules/pages/mydoc.md`                                    |
| 관리자         | `.claude/rules/pages/admin.md`                                    |
