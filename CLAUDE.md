# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**MuruAI는 특수교육 교사를 위한 캔버스 기반 학습자료 제작 도구입니다.**

## 주요 명령어

```bash
yarn dev          # 개발 서버 (Vite HMR)
yarn build        # 프로덕션 빌드 (tsc -b && vite build)
yarn typecheck    # 타입 검사만 (tsc -b --noEmit)
yarn lint         # ESLint + 타입 검사
yarn preview      # 빌드 결과 미리보기
```

## 기능별 상세 지침

작업 영역에 따라 해당 지침을 참조하세요:

| 영역 | 지침 파일 | 설명 |
|------|----------|------|
| 캔버스 에디터 | [@import .claude/rules/editor.md] | 디자인 편집기 핵심 |
| 홈 페이지 | [@import .claude/rules/home.md] | 학습자/그룹 관리 |
| 관리자 | [@import .claude/rules/admin.md] | 서비스 지표 대시보드 |
| 내 보관함 | [@import .claude/rules/mydoc.md] | 문서 관리 |
| 공용 모듈 | [@import .claude/rules/shared.md] | 공용 코드 규칙 |
| 상태 관리 | [@import .claude/rules/zustand.md] | Zustand 패턴 |
| 코드 스타일 | [@import .claude/rules/code-style.md] | TS/React/주석 컨벤션 |

## 코드 스타일 요약

상세 내용: `.claude/rules/code-style.md`

```typescript
// 타입 import는 type 키워드 사용
import type { CanvasElement } from './canvasTypes';

// 함수 컴포넌트는 arrow function
const MyComponent = () => { ... };

// ❌ 불필요한 memo/useCallback 금지 (React Compiler 사용 중)
// ✅ 참조 동일성 필수, 명확한 성능 병목일 때만 사용
```

### 주석 원칙
- **최소화** - 코드가 자명해야 함
- **JSDoc** - `shared/` 유틸 함수에만 (`@param`, `@returns`)
- **Props 문서화** - 외부 노출 interface만
- **스타일 주석 금지**

### 폴더 구조
```
src/
  app/                     # 엔트리, 라우팅, 레이아웃, Provider
    config/Router.tsx      # 라우트 정의
    layout/                # MainLayout, DesignLayout
    providers/             # AppRouterProvider
  features/                # 기능별 모듈 (feature-first)
    admin/                 # 관리자 대시보드
    auth/                  # 인증 (OAuth callback)
    editor/                # 캔버스 에디터 (핵심)
    home/                  # 홈 (학습자/그룹 관리)
    mydoc/                 # 내 보관함
  shared/                  # 공용 모듈 (features 의존 금지)
    components/            # AuthModal, ErrorFallback
    hooks/                 # useAuth
    lib/                   # initSentry, mixpanel
    providers/             # AuthProvider
    store/                 # useAuthStore, useModalStore
    supabase/              # Supabase 클라이언트
    ui/                    # BaseModal, layout/

features/<feature>/        # 각 feature 내부 구조
  pages/                   # 라우트 레벨 (조합만, 로직 금지)
  hooks/                   # 커스텀 훅 (로직 담당)
  store/                   # Zustand 스토어
  ui/                      # 컴포넌트
    parts/                 # 작은 UI 조각
    sections/              # 페이지 섹션
  model/                   # 타입, 도메인 모델
  utils/                   # 유틸리티 함수
  api/                     # API 호출 (admin)
  constants/               # 상수 정의
```

## 핵심 규칙

### 1. Feature 의존성 (엄격)
```typescript
// ❌ feature 간 직접 import 금지
import { useEditorStore } from '@/features/editor/store/...';  // in features/home

// ❌ shared → features import 금지
import { MyDocPage } from '@/features/...';  // in shared/

// ✅ 공용 코드는 shared로 승격
```

### 2. Zustand selector 필수
```typescript
// ❌ 전체 구독 금지
const { tool, selectedIds } = useStore();

// ✅ 필요한 값만 구독
const tool = useStore((s) => s.tool);
```

### 3. 고빈도 이벤트 분리
```typescript
// ❌ pointer move마다 store 업데이트 금지
onPointerMove={(e) => store.setPosition(e.clientX, e.clientY)}

// ✅ 로컬 상태로 처리, 완료 시에만 store 반영
```

## 주의사항

- **Supabase 쿼리에 user_id 필터 필수** - RLS 외에도 프론트에서 검증
- **canvas_data 파싱** - JSON 문자열과 객체 모두 처리해야 함
- **orientation 값 검증** - 'horizontal' | 'vertical' 외에는 'vertical' 폴백
- **삭제 작업 순서** - 외래키 연결 테이블 먼저 삭제 (user_made_targets_n → user_made_n)
- **템플릿 적용 중 히스토리** - isApplyingTemplateRef 체크로 충돌 방지

## 환경 변수

```bash
VITE_SUPABASE_URL           # Supabase 프로젝트 URL
VITE_SUPABASE_PUBLISHABLE_KEY  # Supabase 공개 키
VITE_SENTRY_AUTH_TOKEN      # Sentry 배포용 (선택)
```

## 경로 별칭

`@/` → `src/` (vite.config.ts)

---

## 지침 관리 모범사례

이 문서와 `.claude/rules/` 파일들은 살아있는 문서입니다:

1. **작업하면서 지침 추가** - 사전에만 추가하지 말고 발견 즉시 기록
2. **PR 리뷰에서 컨벤션 발견 시 업데이트**
3. **정기적으로 오래된/상충되는 규칙 검토 및 제거**
4. **300줄 이하 유지** - 상세 내용은 rules/ 파일로 분리
5. **정말 중요한 규칙만 강조** - 모든 것을 강조하면 아무것도 강조되지 않음
