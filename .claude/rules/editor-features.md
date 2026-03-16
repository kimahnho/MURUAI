---
paths:
  - "src/features/editor/**"
  - "src/pages/editor/**"
---

# Editor — 기능별 상세 구현 지침

> 에디터 핵심 아키텍처 및 파일 구조: `.claude/rules/editor.md`

## 페이지 넘버링 구현 지침

### 관련 파일
- 타입: `src/features/editor/model/pageTypes.ts` — `PageNumbering` 인터페이스
- 기본값/유틸: `src/features/editor/utils/pagePresentation.ts`
- 스토어: `src/features/editor/store/pageSettingsStore.ts`
- 스토어 구독: `src/features/editor/hooks/usePageSettingsSubscription.ts`
- 렌더: `src/features/editor/sections/canvas/DesignPaper.tsx`
- 설정 UI: `src/features/editor/sections/sidebar/content/PageContent.tsx`

### PageNumbering 타입

```typescript
interface PageNumbering {
  enabled: boolean;
  format: PageNumberFormat;      // "number" | "dash" | "korean" | "english"
  position: PageNumberPosition;  // "bottom-left" | "bottom-center" | "bottom-right"
  startPage: number;             // 넘버링을 시작할 페이지 위치 (기본값 1)
}
```

### startPage 동작 규칙
- `startPage = 3` 설정 시: 1·2페이지는 번호 없음, 3페이지부터 `- 1 -`, `- 2 -`, `- 3 -` ...
- 표시 번호 = `pageNumber - startPage + 1`
- `pageNumber < startPage` 이면 번호 미표시
- `numbering` 설정은 **전체 페이지에 일괄 적용** (`usePageSettingsSubscription`에서 `pages.map(...)`)
- 배경(`background`)은 활성 페이지에만 적용됨 (넘버링과 다름)

### cloneNumbering 규칙
새 필드 추가 시 `pageSettingsStore.ts`의 `cloneNumbering` 함수에 반드시 추가해야 함.
기존 저장 데이터 호환을 위해 `?? 기본값` 폴백 패턴 사용:
```typescript
startPage: numbering.startPage ?? 1,
```

## 템플릿 PDF 자산 관리

- 경로: `src/features/editor/templates/template_pdf/<template-slug>/`
- 각 템플릿 폴더에는 아래 두 파일을 유지한다.
  - `template.pdf`: 원본 템플릿 PDF
  - `preview.png`: 에디터/썸네일에서 사용하는 배경 이미지(고해상도 권장)
- 템플릿이 "배경만" 필요한 경우 템플릿 TS 파일(`src/features/editor/templates/*.ts`)의 `elements`는 빈 배열(`[]`)로 유지한다.
- 실제 페이지 배경 적용은 `src/features/editor/utils/pageFactory.ts`의 `getTemplateBackground()`에서 `templateId -> preview.png`를 매핑한다.
- 사이드바 템플릿 썸네일 배경은 `src/features/editor/sections/sidebar/content/TemplateContent.tsx`의 `getTemplatePreviewBackground()`에서 동일 매핑을 유지한다.
- 바텀 페이지 썸네일은 `DesignPaper`에 `background={page.background}` 전달 방식으로 렌더하므로, 템플릿 배경은 페이지 데이터에만 정상 주입되면 자동 노출된다.

## 하단바 다중 페이지 선택 및 복사/붙여넣기

- `selectedPageIds: string[]`를 BottomBar 로컬 state로 관리 (캔버스 활성 페이지 `selectedPageId`와 별도)
- **Shift+클릭**: 앵커(`selectedPageId`)~클릭 페이지 범위를 `selectedPageIds`에 저장
- **Cmd/Ctrl+클릭**: 개별 페이지 토글. 앵커 페이지(`selectedPageId`)는 제거 불가
- **단일 클릭**: `onSelectPage` 호출 + `selectedPageIds` 초기화
- `selectedPageId` 변경 시 `selectedPageIds` 자동 초기화 (useEffect)
- **Ctrl+C**: `selectedPageIds`가 있으면 해당 배열을, 없으면 `[selectedPageId]`를 `sessionStorage.copiedPageIds`(JSON)에 저장
- **Ctrl+V**: `handlePastePages(selectedPageId)` 호출 → `copiedPageIds` 배열을 읽어 대상 페이지 직후에 순서대로 삽입
- `handlePastePages`는 `copiedPageIds` 우선, 없으면 `copiedPageId` 폴백 (`usePageActions.ts`)
- **keydown 핸들러의 클로저 문제 주의**: `selectedPageIds`, `selectedPageId`, `pages`, `onSelectPage`, `onPastePages`는 별도 ref로 유지하고, keydown useEffect는 빈 dependency(`[]`)로 한 번만 등록해 최신 값은 ref에서 읽는다

## 캔버스 파일 드래그 앤 드롭

- OS 파일 탐색기에서 JPG/PNG/SVG 파일을 캔버스에 직접 드래그 앤 드롭하면 이미지 요소 생성
- 지원 파일: `image/jpeg`, `image/png`, `image/svg+xml` (`useImageUploadToCloudinary.ts`와 동일)
- 흐름: 로컬 프리뷰 즉시 표시(`URL.createObjectURL`) → 백그라운드 Cloudinary 업로드 → `fill` URL 교체 → 실패 시 요소 제거 + `revokeObjectURL`
- `DesignPaper.tsx`의 `onDrop`에서 사이드바 드래그(`application/x-muru-image`)와 OS 파일 드롭(`dataTransfer.files`)을 분기 처리
- 파일 드롭 로직은 `useCanvasFileDrop` 훅(`src/features/editor/hooks/useCanvasFileDrop.ts`)에서 처리 — `DesignPaper`에는 `onFileDropOnCanvas` prop으로 전달
- `getElements` 콜백 패턴: 비동기 업로드 완료 시점에 최신 elements를 참조하기 위해 사용
- 이미지 크기: 원본 비율 유지, 최대 300px
- 업로드 완료 시 `triggerRefetch()`로 사이드바 업로드 목록 동기화

## 선/화살표 마커(양방향 화살표)

### 마커 옵션 (`LinePropsContent.tsx`)

```typescript
const MARKER_OPTIONS = [
  { key: "none",  label: "없음", value: { start: false, end: false } },
  { key: "end",   label: "끝",   value: { start: false, end: true } },
  { key: "start", label: "시작", value: { start: true,  end: false } },
  { key: "both",  label: "양쪽", value: { start: true,  end: true } },
];
```

### `resolveMarkers` 유틸 (`designPaperUtils.ts`)

```typescript
// marker 필드가 없는 기존 요소와 호환하면서 유효한 마커 상태를 반환
export const resolveMarkers = (element: LineElement): { start: boolean; end: boolean } => {
  if (element.marker) return { start: element.marker.start ?? false, end: element.marker.end ?? false };
  return { start: false, end: element.type === "arrow" };  // arrow는 기본 끝 마커
};
```

### SVG 렌더링 (`Line.tsx`, `Arrow.tsx`)

- `<defs>` 내 `<marker>` 요소로 삼각형 화살표 정의 (viewBox `0 0 10 10`)
- 시작 마커: `refX="1"` (화살표 끝이 선 시작점에 닿도록)
- 끝 마커: `refX="9"` (화살표 끝이 선 끝점에 닿도록)
- `<line>`/`<polyline>`의 `markerStart`/`markerEnd` 속성에 `url(#id)` 할당
- 마커 ID: `{type}-start-{id}`, `{type}-end-{id}` (요소별 고유)
- 마커가 있으면 `markerPadding = 12`로 바운딩 박스 확장

### 관련 파일

| 역할 | 경로 |
|------|------|
| 마커 해석 유틸 | `src/features/editor/utils/designPaperUtils.ts` |
| 사이드바 패널 | `src/features/editor/sections/sidebar/content/LinePropsContent.tsx` |
| 선 렌더러 | `src/features/editor/sections/canvas/elements/line/Line.tsx` |
| 화살표 렌더러 | `src/features/editor/sections/canvas/elements/arrow/Arrow.tsx` |

## 어휘 카드 따라쓰기 자동 생성

### 기능 흐름

1. 어휘 학습 카드 페이지(`templateId === "vocabularyLearningCard"`) 선택 시 캔버스 상단에 플로팅 배너 표시
2. 모든 카드의 목표 어휘가 기본값(`"목표 어휘"`)에서 실제 단어로 변경되면 버튼 활성화
3. 버튼 클릭 → `vocabTracingStore.requestVocabTracing(pageId)` → 구독이 감지
4. `extractVocabLabels()`로 imageSlot의 labelId 참조를 통해 어휘 텍스트 추출
5. `buildVocabTracingPages()`로 따라쓰기 그리드 페이지 생성 (가이드 1묶음 + 빈 칸 2묶음 × 단어 수)
6. 현재 어휘 카드 페이지 바로 뒤에 삽입 → 첫 생성 페이지로 자동 이동
7. `recordHistory("어휘 따라쓰기 생성")`으로 Undo 지원

### 어휘 추출 방식

```typescript
// imageSlot(subType === "imageSlot")의 labelId → 매칭 text 요소의 text 속성
const imageSlots = elements.filter(isImageSlotWithLabel);
const textEl = elements.find(el => el.type === "text" && el.id === slot.labelId);
```

- 기본값 `"목표 어휘"` 및 빈 문자열은 제외
- 복사/붙여넣기로 추가한 카드도 labelId 리맵 덕분에 정상 인식

### 그리드 레이아웃 상수

```typescript
TRACING_FONT_FAMILY = "Hakgyoansim Badasseugi"  // 학교안심 받아쓰기, weight 700
VOCAB_CELL_SIZE_MM = 13      // 셀 크기
REPEAT_COUNT = 3             // 가이드 1 + 빈칸 2
REP_GAP_MM = 3               // 묶음 간 간격
PAGE_TOP_MARGIN_MM = 16      // 상단 여백
PAGE_BOTTOM_MARGIN_MM = 16   // 하단 여백
DYNAMIC_GAP_MAX_MM = 20      // 동적 간격 최대값
```

### 버튼 활성화 조건

`isAllVocabFilled(elements)`: 페이지 내 **모든** imageSlot이 다음 두 조건을 동시에 충족해야 `true`:
1. 이미지 삽입됨 (`fill.startsWith("url(")` 또는 `fill.startsWith("data:")`)
2. 연결된 라벨 텍스트가 기본값(`"목표 어휘"`)이 아닌 실제 단어로 변경됨

`getVocabUnfilledReason(elements)`: 미충족 사유를 반환 (`"missing-image"` / `"missing-label"` / `"filled"`). `VocabTracingBanner`에서 사유별 안내 문구를 분기 표시한다.

### 관련 파일

| 역할 | 경로 |
|------|------|
| 플로팅 배너 | `src/features/editor/sections/canvas/VocabTracingBanner.tsx` |
| 생성 요청 스토어 | `src/features/editor/store/vocabTracingStore.ts` |
| 어휘 추출 + 그리드 빌더 | `src/features/editor/utils/tracingGridUtils.ts` |
| 구독 (페이지 삽입) | `src/features/editor/hooks/useEditorSubscriptions.ts` |
| 배너 렌더링 | `src/features/editor/shared/MainSection.tsx` |
| 어휘 카드 템플릿 | `src/features/editor/templates/vocabularyLearningCardTemplate.ts` |
