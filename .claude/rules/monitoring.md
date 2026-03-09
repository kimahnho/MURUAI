# 모니터링 및 분석 지침

## 모니터링 스택 개요

| 도구 | 역할 | 초기화 |
|------|------|--------|
| **Sentry** | 에러 추적 + 성능 모니터링 + 세션 리플레이 | `initSentry()` → `main.tsx` |
| **Mixpanel** | 사용자 행동 분석 (이벤트 트래킹) | `initMixpanel()` → `main.tsx` |
| **Vercel Analytics** | Core Web Vitals + 페이지뷰 자동 추적 | `<Analytics />` → `main.tsx` |
| **Vercel Speed Insights** | 성능 측정 | `<SpeedInsights />` → `main.tsx` |
| **Supabase DB 이벤트** | 서버사이드 이벤트 기록 (활동, 다운로드, 템플릿) | `trackEvents.ts` 함수 직접 호출 |

## Sentry 규칙

### 사용자 컨텍스트
- 로그인 시 `Sentry.setUser({ id, email })` — `AuthProvider.tsx`에서 처리
- 로그아웃 시 `Sentry.setUser(null)`
- 다른 곳에서 `Sentry.setUser` 직접 호출 금지

### 에러 바운더리
- `Sentry.ErrorBoundary`는 앱 루트(`AppRouterProvider.tsx`)에 1개만 유지
- 폴백 UI: `ErrorFallback` 컴포넌트 (`src/shared/ui/ErrorFallback.tsx`)
- 개발 모드에서만 에러 상세 메시지 표시

### 샘플링 설정 (변경 시 주의)

```typescript
// src/shared/utils/initSentry.ts
tracesSampleRate:           isProd ? 0.15 : 1.0   // 성능 트레이스
replaysSessionSampleRate:   isProd ? 0.03 : 1.0   // 세션 리플레이
replaysOnErrorSampleRate:   isProd ? 0.3  : 1.0   // 에러 시 리플레이
```

### 소스맵
- `@sentry/vite-plugin`이 빌드 시 소스맵 업로드 → 업로드 후 삭제
- Release: `SENTRY_RELEASE` → `VERCEL_GIT_COMMIT_SHA` → `VITE_SENTRY_RELEASE` 우선순위

## Mixpanel 규칙

### 래퍼 필수 사용

`mp` 래퍼는 `isMixpanelInitialized()` 가드를 내장하고 있어 토큰 미설정 시 안전하게 무시된다.

```typescript
// ✅ 올바른 방식: mp 래퍼 사용 (초기화 안전 가드 내장)
import { mp } from "@/shared/utils/mixpanel";
mp.track("이벤트명", { key: "value" });

// ❌ 금지: mixpanel 직접 import (초기화 가드 없음)
import mixpanel from "mixpanel-browser";
mixpanel.track("이벤트명");
```

### 사용자 식별
- `mp.identify(userId)` + `mp.setUserProfile({ email })` — `AuthProvider.tsx`에서 처리
- `mp.reset()` — 로그아웃 시 호출
- 다른 곳에서 `mp.identify` / `mp.reset` 직접 호출 금지

### 이벤트 네이밍 규칙
- 한국어 사용 (예: `"페이지 추가"`, `"요소 생성"`)
- 동사 + 명사 패턴 (예: `"PDF 다운로드"`, `"이미지 업로드"`)
- 속성 키는 영어 snake_case (예: `element_type`, `prompt_length`)

### 현재 추적 이벤트 목록

| 이벤트명 | 파일 | 속성 |
|----------|------|------|
| `요소 생성` | `elementStore.ts` | `element_type` |
| `사이드바 열기` | `sideBarStore.ts` | `panel` |
| `이야기순서 보드 생성` | `storyBoardStore.ts` | `count`, `direction` |
| `AAC 보드 생성` | `aacBoardStore.ts` | `rows`, `columns` |
| `이미지 추가` | `imageFillStore.ts` | `source` |
| `페이지 추가` | `usePageActions.ts` | — |
| `페이지 복제` | `usePageActions.ts` | — |
| `페이지 삭제` | `usePageActions.ts` | — |
| `요소 삭제` | `usePageActions.ts` | `count` |
| `대상에 저장` | `ExportModal.tsx` | `target_type` |
| `PDF 다운로드` | `ExportModal.tsx` | `page_mode` |
| `{label} 템플릿 적용` | `useTemplateApplyActions.ts` | `template_id`, `template_name`, `target` |
| `{label} 템플릿 클릭` | `useTemplateContentState.ts` | `template_id`, `template_name` |
| `AI 이미지 생성` | `useAiImageGeneration.ts` | `style`, `prompt_length` |
| `이미지 업로드` | `useImageUploadToCloudinary.ts` | `file_type` |
| `맞춤법 검사` | `ExportModal.tsx` | `correction_count` |

### 새 이벤트 추가 시

1. `mp.track()` 호출 위치는 해당 액션이 **성공한 직후** (API 호출 전이 아님)
2. 이벤트명은 위 네이밍 규칙 준수
3. 이 지침 파일의 이벤트 목록 테이블에 추가
4. DB 추적이 필요하면 `trackEvents.ts`에도 함수 추가 (이중 추적)

## Supabase DB 이벤트 추적 규칙

### 비차단 패턴 필수

```typescript
// ✅ 올바른 방식: void + console.warn
void trackActivityEvent("login", userId);

// trackEvents.ts 내부:
if (error) {
  console.warn("activity_events insert failed", error);
}

// ❌ 금지: await + throw (사용자 흐름 차단)
await trackActivityEvent("login", userId);
```

### 추적 함수

| 함수 | 테이블 | 호출 위치 |
|------|--------|----------|
| `trackActivityEvent(type, userId?)` | `activity_events` | `AuthProvider.tsx` |
| `trackDownloadEvent(userId?, userMadeId?)` | `download_events` | `ExportModal.tsx` |
| `trackTemplateUsageEvent(templateId, userId?, userMadeId?)` | `template_usage_events` | `useTemplateApplyActions.ts` |

### Mixpanel과 DB 이중 추적

템플릿 적용, PDF 다운로드는 Mixpanel + DB 양쪽에서 추적한다.
- Mixpanel: 실시간 대시보드 + 퍼널 분석용
- DB: 관리자 페이지 집계 + 장기 보관용

## Vercel Analytics & Speed Insights

- `main.tsx`에서 `<Analytics />`, `<SpeedInsights />` 렌더
- 별도 설정 불필요 — Vercel 배포 시 자동 활성화
- 코드 변경 없이 Vercel 대시보드에서 확인

## 프로덕션 콘솔 제거

```typescript
// vite.config.ts
esbuild: {
  drop: mode === "production" ? ["console", "debugger"] : [],
}
```

프로덕션에서 `console.*` 호출이 모두 제거되므로:
- 에러 추적은 반드시 Sentry 의존 (`console.error` 만으로 부족)
- `trackEvents.ts`의 `console.warn`은 개발 모드에서만 동작

## 환경 변수

| 변수 | 용도 | 필수 |
|------|------|------|
| `VITE_SENTRY_DSN` | Sentry 프로젝트 DSN | ✅ |
| `VITE_SENTRY_AUTH_TOKEN` | Sentry 소스맵 업로드 토큰 | 빌드 시 |
| `VITE_MIXPANEL_TOKEN` | Mixpanel 프로젝트 토큰 | ✅ |
| `SENTRY_RELEASE` | 릴리스 태그 (Vercel 배포 시 자동) | 선택 |

## 관련 파일

| 역할 | 경로 |
|------|------|
| Sentry 초기화 | `src/shared/utils/initSentry.ts` |
| Mixpanel 초기화 | `src/shared/utils/initMixpanel.ts` |
| Mixpanel 래퍼 | `src/shared/utils/mixpanel.ts` |
| DB 이벤트 추적 | `src/shared/utils/trackEvents.ts` |
| 앱 엔트리 | `src/main.tsx` |
| 인증 Provider | `src/shared/providers/AuthProvider.tsx` |
| 에러 바운더리 래핑 | `src/app/providers/AppRouterProvider.tsx` |
| 에러 폴백 UI | `src/shared/ui/ErrorFallback.tsx` |
| 빌드 설정 | `vite.config.ts` |
