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

> 현재 서비스는 서버 렌더링 없이 브라우저에서 PDF를 생성한다.
> 목표는 **저사양 기기에서도 보이는 화면과 최대한 동일한 결과**를 유지하는 것.

## 1. 현재 동작 방식 (우리 서비스 기준)

1. 사용자가 `내보내기 > PDF 다운로드`를 실행한다.
2. `DesignLayout.preparePdfPages`가 실행된다.
3. 페이지 스왑 저장소(`pageSwapStore`)에 hydration 요청을 보내 모든 페이지를 복원한다.
4. 숨김 렌더 컨테이너(`PdfPreviewContainer`)에 각 페이지를 `.pdf-page` DOM으로 렌더한다.
5. `generatePdfFromDomPages`가 `.pdf-page`를 순회하며 `html-to-image`(`htmlToImage.toJpeg`)로 캡처한다.
6. 페이지별 캡처 이미지를 `jsPDF`에 추가해 최종 PDF Blob을 만든다.
7. Blob을 파일로 다운로드한다.

## 2. 핵심 파일

- `src/app/layout/DesignLayout.tsx`
  - `preparePdfPages`, `cleanupPdfPages`
- `src/features/editor/shared/PdfPreviewContainer.tsx`
  - PDF 대상 DOM 생성 (`.pdf-page`)
- `src/features/editor/shared/ExportModal.tsx`
  - 내보내기 실행/진행률/취소 UI
- `src/features/editor/utils/userMadeExport.ts`
  - `generatePdfFromDomPages` (html-to-image + jsPDF)
- `src/features/editor/store/pageSwapStore.ts`
  - PDF 중 스왑/하이드레이션 제어 상태
- `src/features/editor/hooks/usePageSwap.ts`
  - 페이지 스왑 인/아웃 수행
- `src/features/editor/hooks/useAutoSave.ts`
  - PDF 생성 중 자동 저장 일시 중지

## preparePdfPages() 순서 — 반드시 준수

에디터는 LRU 기반 페이지 스왑(가상 스크롤)으로 현재 페이지 주변 ~8개만 메모리에 유지하고 나머지는 IndexedDB에 스왑 아웃한다. PDF 출력 시 모든 페이지를 복원해야 하므로 아래 순서를 지켜야 한다.

**올바른 순서** (`src/app/layout/DesignLayout.tsx` `preparePdfPages()`):
```
1. setPdfPreviewActive(true) + setIsPdfPreviewActive(true)   ← 먼저 pdfPreviewActive 설정
2. RAF × 2 대기                                              ← React 렌더 완료 → requiredPageIds가 전체 페이지로 확장
3. requestHydration()                                        ← 이 시점에 requiredPageIds = 모든 페이지
4. waitForHydration(requestId)                               ← 모든 페이지 IndexedDB 복원 완료 대기
5. RAF × 2 대기                                              ← 레이아웃 안정화
```

**금지 패턴** (레이스 컨디션 발생):
```
requestHydration() → setPdfPreviewActive(true) → waitForHydration()
```
이 순서로 하면 `requiredPageIds`가 아직 "현재 페이지 주변 8개"인 상태에서 `loadMissing()`이 실행되어 "로드할 페이지 없음"으로 판단, `hydrationReady`를 즉시 호출해 스왑된 페이지들이 흰색으로 출력된다.

## 3. 현재 적용된 최적화 (시행 중)

### 3.1 하이드레이션/스왑 안정화
- PDF 시작 전에 `requestHydration -> waitForHydration`으로 스왑된 페이지를 먼저 복원한다.
- PDF 생성 중 `pdfExporting` 상태를 사용해 자동 저장을 멈춰 스냅샷 일관성을 지킨다.

### 3.2 렌더링 안정화
- 캡처 전 폰트 로드 완료(`document.fonts.ready`)를 기다린다.
- 캡처 전 이미지 로드/디코드를 기다린다.
- 프레임 대기(`requestAnimationFrame`)를 넣어 레이아웃 반영 타이밍을 맞춘다.

### 3.3 메모리/성능 최적화
- 페이지를 순차 처리한다(동시 렌더 금지).
- 각 페이지를 PDF에 추가한 뒤 canvas 메모리를 즉시 해제한다.
- 진행률(`current/total`) 표시, 취소(AbortController) 지원.

### 3.4 최근 보정 사항 (저사양/기기차 대응)
- `PdfPreviewContainer`를 극단적 음수 좌표(`-999999px`)에 두지 않고, 동일 좌표계(0,0) + `opacity: 0`로 렌더.
- `html-to-image` 호출에서 강제 크롭 파라미터를 제거.
- 이미지 절대 좌표를 강제 정수화하던 보정 로직을 제거(잘림/위치 오차 가능성 감소).

## 4. 저사양 기기 우선 운영 원칙

1. **결정적 캡처 우선**
   - DOM을 임의로 재배치/강제 보정하지 말고, 실제 렌더 결과를 그대로 캡처한다.

2. **페이지 단위 직렬 처리**
   - 한 번에 한 페이지만 렌더/삽입/해제한다.

3. **캡처 전 대기 규칙 준수**
   - 폰트 준비 + 이미지 decode + 최소 1~2 frame 대기는 필수.

4. **스케일은 보수적으로**
   - 저사양 타깃일수록 `quality/scale`를 공격적으로 높이지 않는다.

5. **PDF 생성 중 상태 고정**
   - 자동 저장, 페이지 스왑, 편집 변경이 겹치지 않게 한다.

## 5. 변경 시 금지/주의사항

### 금지
- PDF 전용 DOM을 화면 좌표계 밖 큰 음수 위치로 이동시키는 방식.
- 캡처 대상 DOM의 폭/높이/좌표를 강제로 재정의하는 크롭 옵션 남발.
- 이미지 컨테이너에 임의 좌표 보정을 일괄 적용.
- 페이지 병렬 캡처.

### 주의
- 이미지 URL은 CORS 허용이 필요하다.
- 폰트 로딩이 늦는 환경에서 텍스트 줄바꿈이 달라질 수 있다.
- 브라우저 엔진 차이로 동일 코드라도 결과 차이가 생길 수 있다.

## 6. 이슈 대응 체크리스트

1. 재현 기기에서 이미지 로딩 완료 여부(`img.complete`, `naturalWidth`) 확인.
2. 폰트 준비 상태(`document.fonts.status`) 확인.
3. PDF 대상 `.pdf-page` 개수와 pageId 매핑이 실제 페이지와 일치하는지 확인.
4. 캡처 전후 페이지 크기(`getBoundingClientRect`)가 비정상적으로 0/축소되지 않는지 확인.
5. 스왑된 페이지가 복원되었는지(`isSwapped === false`) 확인.

## 7. 향후 개선 우선순위 (서버 없이)

1. 기기 성능 기반 동적 캡처 스케일(저사양 fallback).
2. 캡처 실패 시 재시도(낮은 품질로 자동 다운그레이드).
3. PDF 전용 회귀 테스트 시나리오(배경 이미지 + 요소 + 다중 페이지).

