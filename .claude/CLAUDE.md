# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

MuruAI는 교육 자료 제작을 위한 캔버스 기반 디자인 에디터(Figma/Canva 유사)입니다. React 19, TypeScript, Vite, Zustand, Supabase로 구축되었습니다.

## 주요 명령어

```bash
yarn dev          # 개발 서버 시작
yarn build        # TypeScript 검사 + Vite 빌드
yarn typecheck    # TypeScript 타입 검사만 (tsc -b --noEmit)
yarn lint         # ESLint + TypeScript 검사
yarn preview      # 프로덕션 빌드 미리보기
```

## 아키텍처

### Feature-First 폴더 구조

```
src/
  app/              # 엔트리, 라우팅 (Router.tsx), 레이아웃, 전역 Provider
  shared/           # 공용 유틸 (features/를 절대 import하지 않음)
    ui/             # 순수 UI 컴포넌트 (비즈니스 로직 금지)
    hooks/          # 범용 훅 (useAuth)
    lib/            # 유틸리티 (initSentry, initMixpanel)
    supabase/       # Supabase 클라이언트 초기화
  features/
    editor/         # 핵심 디자인 에디터 기능
      hooks/        # 에디터 전용 훅 (useSelectionState, useAutoSave 등)
      model/        # Zustand 스토어 + 타입 (canvasTypes, useDragResize 등)
      store/        # 상태 스토어 (elementStore, fontStore, templateStore 등)
      ui/parts/     # 캔버스 컴포넌트 (DesignPaper, CanvasStage, 툴바)
      ui/sections/  # 레이아웃 섹션 (MainSection, SideBar)
      templates/    # 템플릿 정의
      utils/        # 에디터 유틸리티
    home/           # 홈 페이지 기능
    admin/          # 관리자 대시보드 기능
  pages/            # 라우트 레벨 페이지
```

### 의존성 규칙

- `shared/*` → `features/*` import 금지
- `features/A` → `features/B` 직접 import 금지 (shared 사용 또는 상위로 승격)
- Page는 조합만 담당, 로직은 hooks/model로 내림

### 상태 관리 (Zustand)

- selector 기반 구독 사용 (스토어 전체 구독 금지)
- 고빈도 이벤트(pointer move, drag, zoom)는 로컬 상태 또는 캔버스 렌더러에서 처리
- 최종 결과(selectedIds 등)만 Zustand에 반영
- 파생값은 저장하지 않고 selector로 계산

```typescript
// ✅ 올바른 방식
const tool = useEditorStore((s) => s.tool);

// ❌ 잘못된 방식 - 전체 스토어 구독
const store = useEditorStore();
```

### React Compiler

React Compiler(babel-plugin-react-compiler)를 사용합니다. 불필요한 `useMemo`/`useCallback` 사용을 피하고, 명확한 성능 근거나 참조 동일성이 필요한 경우에만 사용합니다.

### 캔버스 아키텍처

- `CanvasStage`: viewport, zoom, pan, 포인터 이벤트 처리
- `DesignPaper`: A4 문서 영역과 요소 렌더링
- 고빈도 포인터 이벤트는 캔버스 로컬 상태에서 처리
- React UI는 툴바, 패널, 인스펙터만 담당

## 경로 별칭

`@/`는 `src/`로 매핑됨 (vite.config.ts에서 설정)

## 주요 파일

- 엔트리: [main.tsx](src/main.tsx)
- 라우터: [Router.tsx](src/app/config/Router.tsx)
- Supabase 클라이언트: [supabase.ts](src/shared/supabase/supabase.ts)
- 메인 에디터: [DesignPage.tsx](src/features/editor/pages/DesignPage.tsx)

## 환경 변수

필수 Supabase 환경 변수 (`VITE_` 접두사 필요):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

## 코딩 컨벤션

- Feature-first 구조 유지
- Tailwind CSS v4 사용
- TanStack Query로 서버 상태 관리
- Lucide React 아이콘 사용

## PDF 출력 구현 지침

- 라이브러리: `html-to-image` (html2canvas 사용 금지 — flex/폰트 레이아웃 오차 발생)
- 파일: `src/features/editor/utils/userMadeExport.ts`
- 렌더 함수: `htmlToImage.toJpeg(page, { pixelRatio, backgroundColor, skipFonts: false, fetchRequestInit })`
- html-to-image는 브라우저 엔진이 직접 SVG foreignObject로 렌더해 에디터 화면과 동일한 결과를 냄
- **금지**: `normalizePdfTextLayout`, `normalizePdfElementCapturePosition`, `buildScaleFallbacks` 같은 DOM 보정 코드 재도입
- **유지 필수**: `waitForFonts`, `waitForImages`, `waitForNextFrame`, `getAdaptiveCaptureScale` — 렌더 안정화에 필요
- vite.config.ts `manualChunks.pdf`: `["html-to-image", "jspdf"]`

## 템플릿 PDF 자산 관리 지침

- 경로: `src/features/editor/templates/template_pdf/<template-slug>/`
- 각 템플릿 폴더에는 아래 두 파일을 유지한다.
  - `template.pdf`: 원본 템플릿 PDF
  - `preview.png`: 에디터/썸네일에서 사용하는 배경 이미지(고해상도 권장)
- 템플릿이 "배경만" 필요한 경우 템플릿 TS 파일(`src/features/editor/templates/*.ts`)의 `elements`는 빈 배열(`[]`)로 유지한다.
- 실제 페이지 배경 적용은 `src/features/editor/utils/pageFactory.ts`의 `getTemplateBackground()`에서 `templateId -> preview.png`를 매핑한다.
- 사이드바 템플릿 썸네일 배경은 `src/features/editor/sections/sidebar/content/TemplateContent.tsx`의 `getTemplatePreviewBackground()`에서 동일 매핑을 유지한다.
- 바텀 페이지 썸네일은 `DesignPaper`에 `background={page.background}` 전달 방식으로 렌더하므로, 템플릿 배경은 페이지 데이터에만 정상 주입되면 자동 노출된다.

## 에디터 하단바 구현 지침

- `@tanstack/react-query`는 서버 데이터 동기화 전용으로 사용하고, UI 가상 스크롤/오프셋 계산 문제 해결 용도로 사용하지 않는다.
- BottomBar 스크롤 경계 계산은 내부 추정값보다 실제 DOM(`scrollWidth`, `clientWidth`)을 기준으로 구현한다.
- 페이지 선택 시 자동 스크롤은 "뷰포트 밖일 때만 최소 이동" 정책을 유지한다.
- 페이지 추가 시 자동 이동은 새 선택 페이지를 기준으로 즉시 정렬하고, 연속 `smooth` 스크롤 충돌을 피한다.

### 하단바 다중 페이지 선택 및 복사/붙여넣기

- `selectedPageIds: string[]`를 BottomBar 로컬 state로 관리 (캔버스 활성 페이지 `selectedPageId`와 별도)
- **Shift+클릭**: 앵커(`selectedPageId`)~클릭 페이지 범위를 `selectedPageIds`에 저장
- **Cmd/Ctrl+클릭**: 개별 페이지 토글. 앵커 페이지(`selectedPageId`)는 제거 불가
- **단일 클릭**: `onSelectPage` 호출 + `selectedPageIds` 초기화
- `selectedPageId` 변경 시 `selectedPageIds` 자동 초기화 (useEffect)
- **Ctrl+C**: `selectedPageIds`가 있으면 해당 배열을, 없으면 `[selectedPageId]`를 `sessionStorage.copiedPageIds`(JSON)에 저장
- **Ctrl+V**: `handlePastePages(selectedPageId)` 호출 → `copiedPageIds` 배열을 읽어 대상 페이지 직후에 순서대로 삽입
- `handlePastePages`는 `copiedPageIds` 우선, 없으면 `copiedPageId` 폴백 (`usePageActions.ts`)
- **keydown 핸들러의 클로저 문제 주의**: `selectedPageIds`, `selectedPageId`, `pages`, `onSelectPage`, `onPastePages`는 별도 ref로 유지하고, keydown useEffect는 빈 dependency(`[]`)로 한 번만 등록해 최신 값은 ref에서 읽는다

## 사이드바 메뉴 구조 지침

- 메뉴 항목: `SideBarMenu` 타입 (`src/features/editor/store/sideBarStore.ts`)
- 클릭 가능한 탭 목록: `MENU_ITEMS` (SideBar.tsx) — props 패널(`shape-props` 등)과 `font`는 포함하지 않음
- 새 탭 추가 시 `SideBarMenu` 타입, `MENU_LABELS`, `MENU_ITEMS`, `CONTENT_COMPONENTS` 4곳 동시 수정 필요
- **감정/AAC 탭**: `"emotion-aac"` 단일 키로 통합, `EmotionAACContent.tsx`에서 내부 탭 전환
  - `EmotionAACContent` 내 상위 탭: 언더라인 방식 (`border-b-2 border-primary`)
  - `EmotionContent` 내 하위 탭: 배경 채움 방식 (`bg-black-10 rounded-lg`) — 두 탭 스타일이 달라야 시각적으로 구분됨
- 요소 선택 시 자동 열리는 props 패널(`shape-props`, `line-props`, `arrow-props`, `text-props`, `aac-props`, `multi-props`, `table`)은 `MENU_ITEMS`에 없음
