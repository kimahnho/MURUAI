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
