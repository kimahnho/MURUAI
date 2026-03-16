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

## 지침 모듈화 원칙

- 지침은 단일 문서에 과도하게 집중시키지 않는다. 주제 경계가 명확해지면 즉시 분리한다.
- 루트 문서(`CLAUDE.md`)는 공통 원칙/우선순위/링크 중심으로 유지한다.
- 분리된 문서는 담당 범위를 파일 상단에 명확히 쓰고, 상호 참조 링크를 포함해야 한다.
- 신규 요구사항 추가 시 기존 문서에 억지로 덧붙이지 말고, 적절하면 새 문서를 생성한다.
- 7~20줄 이하의 마이크로 섹션은 관련 주제끼리 묶어 하나의 문서로 관리한다 (파일 수 폭증 방지).

## 도메인별 상세 지침

| 도메인                     | 규칙 파일                                             |
| -------------------------- | ----------------------------------------------------- |
| 에디터 전반                | `.claude/rules/editor.md`                             |
| 에디터 사이드바 패널       | `.claude/rules/editor-sidebar-panel.md`               |
| 에디터 기능별 상세         | `.claude/rules/editor-features.md`                    |
| 캔버스 아키텍처            | `.claude/rules/canvas-architecture.md`                |
| 캔버스 인터랙션            | `.claude/rules/canvas-interaction.md`                 |
| 도형 요소                  | `.claude/rules/shape-elements.md`                     |
| 히스토리/Undo-Redo         | `.claude/rules/history-undo.md`                       |
| 페이지 팩토리/템플릿       | `.claude/rules/page-factory-templates.md`             |
| 이미지 채우기 시스템       | `.claude/rules/image-fill-system.md`                  |
| 맞춤법 검사                | `.claude/rules/spell-check.md`                        |
| 구독 패턴                  | `.claude/rules/subscriptions.md`                      |
| 복사/붙여넣기              | `.claude/rules/copy-paste.md`                         |
| 하단 바                    | `.claude/rules/bottom-bar.md`                         |
| AAC 카드 요소              | `.claude/rules/aac-card-element.md`                   |
| 선/화살표 요소             | `.claude/rules/line-arrow-elements.md`                |
| 스마트 가이드              | `.claude/rules/smart-guides.md`                       |
| 요소 패널 스토어           | `.claude/rules/element-panel-store.md`                |
| PDF 출력                   | `.claude/rules/pdf-export.md`                         |
| TextBox                    | `.claude/rules/textbox.md`                            |
| Table                      | `.claude/rules/table.md`                              |
| Zustand                    | `.claude/rules/zustand.md`                            |
| 코드 스타일                | `.claude/rules/code-style.md`                         |
| DB/Supabase                | `.claude/rules/database.md`                           |
| 모니터링 (Sentry/Mixpanel) | `.claude/rules/monitoring.md`                         |
| AI 감정 추론 생성          | `.claude/rules/emotion-inference-ai-generation.md`    |
| 스토리북 AI 생성기         | `.claude/rules/storybook.md`                          |
| 홈페이지                   | `.claude/rules/home-page.md`, `.claude/rules/home.md` |
| 내 문서                    | `.claude/rules/mydoc.md`                              |
| 관리자                     | `.claude/rules/admin.md`                              |
| 폰트 시스템                | `.claude/rules/font.md`                               |
| shared 모듈                | `.claude/rules/shared.md`                             |
