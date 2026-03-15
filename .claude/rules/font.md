---
paths:
  - "src/shared/utils/fontOptions.ts"
  - "src/shared/utils/cdnFontLoader.ts"
  - "src/shared/utils/cdnFontRegistry.ts"
  - "src/features/editor/sections/sidebar/content/FontContent.tsx"
  - "src/features/editor/shared/InlineFontPicker.tsx"
  - "src/features/editor/sections/sidebar/hooks/useFontContentState.ts"
---

# 폰트 시스템 지침

> 에디터 폰트 구조, CDN 폰트 로딩, 폰트 피커 UI, 인라인 폰트 적용 규칙을 다룬다.

## 2-Tier 폰트 시스템

| Tier | 수량 | 소스 | 로딩 방식 |
|------|------|------|----------|
| **Builtin** | 22개 | 로컬 파일 + 정적 `@font-face` (CSS) | 항상 로드됨 |
| **CDN** | 184개 | Cloudinary URL + 동적 `@font-face` 주입 | on-demand 로딩 |

- `FontOption.source`: `"builtin"` (기본값/undefined) 또는 `"cdn"`
- CDN 폰트 레지스트리(`cdnFontRegistry.ts`)는 **자동 생성 파일** — 직접 수정 금지, `yarn generate:fonts`로 재생성

## CDN 폰트 로딩 규칙

CDN 폰트를 사용하는 모든 경로에서 `loadCdnFont()` 호출 필수.

```typescript
import { loadCdnFont, isCdnFont, isFontLoaded } from "@/shared/utils/cdnFontLoader";

// 폰트 선택 시 로드 후 적용
if (isCdnFont(family)) {
  await loadCdnFont(family, weight);  // weight 생략 시 모든 weight 로드
}
```

### 이중 주입 메커니즘

`loadCdnFont()`는 FontFace API + `<style>` 태그를 동시에 주입한다.

- **FontFace API**: 브라우저 렌더링에 사용 — 에디터 캔버스 실시간 반영
- **`<style>` 태그**: `html-to-image`가 `document.styleSheets`를 순회해 `@font-face` 수집 — PDF 출력 호환

```typescript
// ❌ 금지: FontFace API만 사용 (PDF 출력 시 폰트 누락)
const fontFace = new FontFace(family, `url(${url})`);
document.fonts.add(fontFace);

// ✅ 올바른 방식: loadCdnFont() 사용 (이중 주입 보장)
await loadCdnFont(family, weight);
```

### 중복/동시 로딩 방지

- `loadedFonts` Set — 이미 로드된 `family:weight` 키 추적
- `loadingPromises` Map — 동일 폰트 동시 요청 시 같은 Promise 공유

## 문서 로드 시 사전 로딩

`MainSection.tsx`의 `useEffect`에서 `collectUsedFontFamilies()` → CDN 폰트 감지 → `loadCdnFont()` 호출.

```typescript
// MainSection.tsx
useEffect(() => {
  const families = collectUsedFontFamilies(pages);
  families.forEach((family) => {
    if (isCdnFont(family)) void loadCdnFont(family);
  });
}, [pages]);
```

## PDF 출력 시 폰트 보장

`userMadeExport.ts`의 `waitForFonts()` 내부에서 CDN 폰트를 명시적으로 로드 후 `document.fonts.ready` 대기.

## 폰트 피커 UI (4섹션 구조)

`FontContent.tsx`(사이드바), `InlineFontPicker.tsx`(인라인) 모두 동일한 구조:

| 섹션 | 아이콘 | 내용 |
|------|--------|------|
| 사용중인 글꼴 | Star | 현재 문서에서 사용 중인 폰트 |
| 최근 사용 글꼴 | Clock | 최근 적용한 폰트 (최대 5개, `recentFontStore`) |
| 기본 글꼴 | Type | Builtin 22개 |
| 추가 글꼴 | Type | CDN 184개 |

### 검색 기능

- 검색 입력 시 `FONT_OPTIONS` 전체를 `label`/`family` 기준 필터
- 검색 중에는 4섹션 대신 "검색 결과" 단일 섹션 표시

### CDN 폰트 지연 로딩 (IntersectionObserver)

- CDN 폰트 행이 뷰포트에 들어올 때만 `loadCdnFont(family, 400)` 호출
- `rootMargin: "100px"` — 100px 미리 로드
- 로드 완료 전까지 `fontFamily: "inherit"` + `opacity: 0.5`로 표시

## 인라인 fontFamily 적용 (per-range)

텍스트 범위별 폰트 적용은 `<span style="font-family: ...">` 인라인 스타일로 처리.

- `RichTextCommand`: `{ type: "setFontFamily"; family: string }` → `applyStylePatchInPlace`
- `PendingInlineStyle`: `fontFamily?: string` — collapsed 커서 시 다음 타이핑에 적용
- **CSS `!important` 금지**: 인라인 fontFamily를 덮어씀
- `stripStyleTags(richText, "fontFamily")`: 요소 레벨 폰트 변경 시 기존 인라인 fontFamily 제거

## 혼합 폰트 감지 (mixed fontFamily "--" 표시)

| 모드 | 함수 | 방식 |
|------|------|------|
| 편집 중 | `resolveFontFamilyFromRange()` | DOM computedStyle 사용 |
| 비편집 | `detectMixedFontFamilyInRichText()` | richText HTML 파싱 |

- `matchFontFamily()`: computedStyle fontFamily → `FONT_OPTIONS.family` 키 정규화 (따옴표/쉼표 제거)
- `InlineFontPicker`: `isMixed` prop → true이면 "--" 표시
- 커서 왼쪽 문자 기준: `resolveLeftCharNode()`

## 사이드바 패널 포커스 보존

- `FontContent` 루트 div에 `data-text-props-panel` 속성 필수
- `isElementInToolbar()` 함수가 `[data-text-props-panel]`을 인식해 편집 세션 종료 방지
- 모든 포맷팅 버튼에 `onMouseDown={(e) => e.preventDefault()}` 추가

## 레지스트리 재생성

```bash
yarn generate:fonts   # batch/font-map.json → src/shared/utils/cdnFontRegistry.ts
```

- 입력: `batch/font-map.json` (Cloudinary 업로드 결과)
- 출력: `src/shared/utils/cdnFontRegistry.ts` (CDN_FONT_ENTRIES 배열)
- 기존 Builtin 폰트와 중복되는 family는 자동 스킵

## 관련 파일

| 역할 | 경로 |
|------|------|
| 폰트 옵션 목록 | `src/shared/utils/fontOptions.ts` |
| CDN 폰트 레지스트리 (자동 생성) | `src/shared/utils/cdnFontRegistry.ts` |
| CDN 폰트 로더 | `src/shared/utils/cdnFontLoader.ts` |
| 레지스트리 생성 스크립트 | `batch/generate-cdn-fonts.mjs` |
| 폰트 업로드 스크립트 | `batch/upload-fonts.js` |
| 폰트 업로드 결과 | `batch/font-map.json` |
| 폰트 사이드바 | `src/features/editor/sections/sidebar/content/FontContent.tsx` |
| 인라인 폰트 피커 | `src/features/editor/shared/InlineFontPicker.tsx` |
| 폰트 선택 훅 | `src/features/editor/sections/sidebar/hooks/useFontContentState.ts` |
| 폰트 스토어 | `src/features/editor/store/fontStore.ts` |
| 최근 폰트 스토어 | `src/features/editor/store/recentFontStore.ts` |
| 텍스트 선택 세션 | `src/features/editor/sections/canvas/elements/text/textSelectionSession.ts` |
| 텍스트 콘텐츠 유틸 | `src/features/editor/sections/canvas/elements/text/textContentUtils.ts` |
| PDF 출력 | `src/features/editor/utils/userMadeExport.ts` |
