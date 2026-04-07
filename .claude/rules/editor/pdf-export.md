---
paths:
  - "src/features/editor/utils/userMadeExport.ts"
  - "src/features/editor/shared/ExportModal.tsx"
  - "src/features/editor/shared/PdfPreviewContainer.tsx"
  - "src/features/editor/store/pageSwapStore.ts"
  - "src/features/editor/hooks/usePageSwap.ts"
  - "src/app/layout/DesignLayout.tsx"
---

# PDF 변환 지침 (클라이언트 렌더링)

> 서버 렌더링 없이 브라우저에서 PDF를 생성한다.
> **저사양 기기에서도 보이는 화면과 최대한 동일한 결과**를 유지하는 것이 목표.

## 1. 파이프라인 개요

`DesignLayout.tsx`의 `generatePdf` 함수가 전체 흐름을 관장한다.
PDF 유틸(`userMadeExport.ts`)과 `perfLogger`는 `generatePdf` 내부에서 **dynamic import**로 로딩한다 — 에디터 초기 로딩 시 PDF 코드를 포함시키지 않기 위함.

```
Phase 0: PDF 유틸 + perfLogger dynamic import
Phase 1: 전체 페이지 하이드레이션 (IndexedDB 복원)
Phase 2: 하이드레이션 후 최신 페이지 읽기 + 필터
Phase 3: html-to-image + jsPDF 라이브러리 동적 로드
Phase 4: 배치별 렌더 + 캡처 (PDF_BATCH_SIZE = 5)
Phase 5: PDF 조립 (assemblePdf)
```

### Phase 1: 하이드레이션

에디터는 LRU 기반 페이지 스왑으로 현재 페이지 주변 ~8개만 메모리에 유지하고 나머지는 IndexedDB에 스왑 아웃한다. PDF 출력 시 모든 페이지를 복원해야 한다.

```typescript
usePageSwapStore.getState().setPdfPreviewActive(true);
const forceId = usePageSwapStore.getState().requestForceHydrate();
await waitForForceHydrate(forceId, dynamicTimeout);
```

- `setPdfPreviewActive(true)` **먼저** 호출 → `requiredPageIds`가 전체 페이지로 확장
- `dynamicTimeout = Math.max(10_000, 5_000 + allPages.length * 500)` — 페이지 수에 비례

### Phase 2: 페이지 필터

```typescript
const hydratedPages = getCanvasData().pages.filter(
  (p) => !pageIds || pageIds.length === 0 || pageIds.includes(p.id),
);
```

### Phase 3: 라이브러리 로드

```typescript
const [htmlToImage, { jsPDF }] = await Promise.all([
  import("html-to-image"),
  import("jspdf"),
]);
```

- vite manualChunks: `pdf: ["html-to-image", "jspdf"]`

### Phase 4: 배치별 렌더 + 캡처

```typescript
const PDF_BATCH_SIZE = 5;

for (let batchStart = 0; batchStart < hydratedPages.length; batchStart += PDF_BATCH_SIZE) {
  const batch = hydratedPages.slice(batchStart, batchStart + PDF_BATCH_SIZE);
  flushSync(() => { setPdfBatchPages(batch); });
  await doubleRaf();

  // 첫 배치에서만 폰트 로드
  if (!fontLoaded) { await waitForPdfFonts(pageElements); fontLoaded = true; }

  for (const pageEl of pageElements) {
    await waitForPdfImages(pageEl);
    await waitForNextFrame();
    const dataUrl = await htmlToImage.toJpeg(pageEl, { pixelRatio: adaptiveScale, ... });
    captures.push({ dataUrl, orientation });
  }
}
```

- `PdfPreviewContainer`에 배치 페이지를 `.pdf-page` DOM으로 렌더
- `flushSync` + `doubleRaf()`로 React 렌더 + 레이아웃 안정화
- `isLikelyBlankCapture(dataUrl)` — 빈 페이지 의심 시 console.warn

### Phase 5: PDF 조립

```typescript
return assemblePdf(captures, jsPDF);
```

- `assemblePdf` — 캡처별 orientation(세로/가로)에 따라 A4 크기 조정 후 이미지 삽입

## 2. 핵심 파일

| 역할 | 경로 |
|------|------|
| PDF 생성 오케스트레이터 | `src/app/layout/DesignLayout.tsx` (`generatePdf`) |
| 숨김 렌더 컨테이너 | `src/features/editor/shared/PdfPreviewContainer.tsx` |
| 내보내기 UI (진행률/취소) | `src/features/editor/shared/ExportModal.tsx` |
| 캡처 유틸 | `src/features/editor/utils/userMadeExport.ts` |
| 스왑/하이드레이션 스토어 | `src/features/editor/store/pageSwapStore.ts` |
| 페이지 스왑 훅 | `src/features/editor/hooks/usePageSwap.ts` |
| 자동 저장 (PDF 중 일시 중지) | `src/features/editor/hooks/useAutoSave.ts` |

## 3. 유틸 함수 (`userMadeExport.ts`)

| 함수 | 역할 |
|------|------|
| `getAdaptiveCaptureScale()` | 기기 성능 기반 동적 캡처 스케일 |
| `waitForPdfFonts()` | `document.fonts.ready` + 폰트 로드 대기 |
| `waitForPdfImages()` | 이미지 `complete` + `decode()` 대기 |
| `waitForNextFrame()` | `requestAnimationFrame` 1프레임 대기 |
| `doubleRaf()` | RAF × 2 대기 (레이아웃 안정화) |
| `resolvePageOrientation()` | DOM에서 페이지 방향(세로/가로) 판별 |
| `assemblePdf()` | 캡처 배열 → jsPDF Blob 조립 |
| `isLikelyBlankCapture()` | 빈 페이지 의심 감지 |

## 4. 금지 패턴

### 하이드레이션 순서

```
❌ 금지: requestForceHydrate() → setPdfPreviewActive(true) → wait
   → requiredPageIds가 아직 "현재 주변 8개"인 상태에서 로드 시작

✅ 필수: setPdfPreviewActive(true) → requestForceHydrate() → wait
   → requiredPageIds가 전체 페이지로 확장된 후 로드
```

### 기타 금지

- PDF 전용 DOM을 화면 좌표계 밖 큰 음수 위치로 이동
- 캡처 대상 DOM의 폭/높이/좌표를 강제 재정의하는 크롭 옵션
- 이미지 컨테이너에 임의 좌표 보정 일괄 적용
- 페이지 병렬 캡처
- `html2canvas` 사용 (`html-to-image`만 허용)
- DOM 보정 코드 재도입 (`normalizePdfTextLayout`, `normalizePdfElementCapturePosition`, `buildScaleFallbacks`)

## 5. 운영 원칙

1. **결정적 캡처 우선** — DOM을 재배치/보정하지 않고 실제 렌더 결과를 그대로 캡처
2. **배치 직렬 처리** — `PDF_BATCH_SIZE` 단위로 렌더/캡처, 배치 간 이벤트 루프 양보
3. **캡처 전 대기 필수** — 폰트 준비 + 이미지 decode + 최소 1~2 frame
4. **스케일 보수적 운용** — `getAdaptiveCaptureScale`로 저사양 기기 대응
5. **PDF 생성 중 상태 고정** — 자동 저장, 페이지 스왑, 편집 변경이 겹치지 않게
6. **AbortController 지원** — 매 배치/페이지에서 `signal.aborted` 체크

## 6. 이슈 대응 체크리스트

1. 이미지 로딩 완료 여부 (`img.complete`, `naturalWidth`)
2. 폰트 준비 상태 (`document.fonts.status`)
3. `.pdf-page` 개수와 pageId 매핑이 실제 페이지와 일치하는지
4. 캡처 전후 페이지 크기 (`getBoundingClientRect`) 비정상 여부
5. 스왑된 페이지 복원 여부 (`isSwapped === false`)
6. `isLikelyBlankCapture` 경고 발생 시 원인 조사
