# 캔버스 아키텍처 지침

## 단일 진실 공급원 (Single Source of Truth)

동일 데이터를 로컬 state와 Zustand store에 이중 관리하지 않는다.

```typescript
// ❌ 금지: 로컬 state + store 이중 관리
const [selectedCells, setSelectedCellsLocal] = useState([]);
const setSelectedCellsStore = useTableStore((s) => s.setSelectedCells);

// ✅ 권장: store를 단일 공급원으로 사용
const selectedCells = useTableStore((s) => s.selectedCells);
const setSelectedCells = useTableStore((s) => s.setSelectedCells);
```

## ID 생성

페이지/요소 ID는 `crypto.randomUUID()`로 통일한다. `Date.now().toString()`이나 커스텀 ID 생성 패턴을 사용하지 않는다.

```typescript
// ✅ 올바른 방식
const newPageId = crypto.randomUUID();

// ❌ 금지: Date 기반 ID
const newPageId = Date.now().toString();
const newId = `element-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
```

## 히스토리 기록

- 깊은 복사는 `structuredClone` 사용 (`JSON.parse(JSON.stringify())` 금지)
- `updatePageById`/`updateElementsByPageId`를 통해 변경이 없으면 원본 참조를 반환해 불필요한 히스토리 엔트리를 방지한다

## Zustand 스토어 외부 구독

스토어 외부에서 `subscribe()`를 사용할 때:
- `settled` 플래그와 `settle()` 함수를 사용해 이중 resolve를 방지한다
- 모든 경로(타임아웃/조건 충족)에서 반드시 `unsubscribe()` 호출을 보장한다

```typescript
// ✅ 올바른 방식: settle 패턴으로 안전한 정리
let settled = false;
const settle = () => {
  if (settled) return;
  settled = true;
  clearTimeout(timer);
  unsubscribe();
  resolve();
};
const timer = setTimeout(settle, TIMEOUT_MS);
const unsubscribe = useStore.subscribe((state) => {
  if (state.targetField >= targetValue) settle();
});
```

## O(n²) 방지

배열 내에서 `includes()` 반복 대신 `Set`을 사용한다.

```typescript
// ❌ 금지: O(n²)
elements.map((el) => {
  if (selectedIds.includes(el.id)) { ... }
});

// ✅ 권장: O(n)
const selectedIdSet = new Set(selectedIds);
elements.map((el) => {
  if (selectedIdSet.has(el.id)) { ... }
});
```

## 감정 슬롯 업데이트 경로

감정 슬롯 요소(`isEmotionSlotShape`)의 rect 업데이트는 이동/리사이즈 **중** `handleRectChange`에서만 실시간 적용한다. 드래그 **종료** 시점(`handleDragStateChange`)에서는 중복 호출하지 않고 정리(activeInteraction 초기화, 가이드 클리어)만 수행한다.

## DesignPaper overflow 규칙

- 편집 모드(`readOnly=false`): `overflow-visible` — 요소가 페이지 바깥으로 나가도 보임
- 읽기 전용(`readOnly=true`, 썸네일/PDF): `overflow-hidden` — 기존 클리핑 유지
- 페이지 바깥 영역은 반투명 화이트 오버레이(`zIndex: 5`, `boxShadow: 0 0 0 9999px rgba(255,255,255,0.65)`)로 시각적 구분
- SmartGuideOverlay(기준선)는 `overflow-hidden` 래퍼(`absolute inset-0`)로 감싸 페이지 바깥으로 나가지 않도록 클리핑

## Z-Index 레이어 구조 (DesignPaper 내부)

| 레이어 | Z-Index | 비고 |
|--------|---------|------|
| 일반 요소 | auto (0) | 바깥 부분은 반투명 오버레이로 페이드 |
| 반투명 오버레이 | 5 | 페이지 바깥 영역 화이트 덮개 |
| 이미지 편집 딤 | 10 | 크롭 편집 시 어두운 오버레이 |
| 편집 중 요소 | 20 | 이미지 편집 대상 요소 |
| SmartGuideOverlay 래퍼 | 20 | overflow-hidden 래퍼 |
| GroupSelectionOverlay | 30 | 다중 선택 바운딩 박스 |
| SelectionRectOverlay | 40 | 드래그 선택 사각형 |
| ShapeTransformBar | 50 | 회전/반전 버튼 + 회전 핸들 |
| FixedToolBar | 50 | 텍스트 인라인 툴바 |
| RotationBadge | 9999 | 회전 중 각도 표시 |

새 오버레이/컨트롤 추가 시 이 레이어 순서를 준수해야 한다.

## 컨텍스트 메뉴 portal 패턴

`DesignPaperContextMenu`는 `createPortal(menu, document.body)`로 렌더링한다. DesignPaper 내부에 두면 `overflow-hidden`(readOnly)이나 상위 `transform: scale()`에 의해 `position: fixed`가 깨진다.

## 대형 컴포넌트 분리 기준

- 훅 10개 이상 또는 500줄 이상인 컴포넌트는 분리를 검토한다
- 렌더링 로직, 인터랙션 로직, 이벤트 핸들링을 하위 컴포넌트/훅으로 추출
- 현재 해당 파일: `DesignPaper.tsx` (697줄, 14+ 훅), `useDesignPaperInteraction.ts` (682줄)

## 관련 파일

| 역할 | 경로 |
|------|------|
| 페이지 스왑 스토어 | `src/features/editor/store/pageSwapStore.ts` |
| 통합 히스토리 스토어 | `src/features/editor/store/unifiedHistoryStore.ts` |
| 페이지 팩토리 | `src/features/editor/utils/pageFactory.ts` |
| 페이지 변경 유틸 | `src/features/editor/utils/pageMutation.ts` |
| 표 스토어 | `src/features/editor/store/tableStore.ts` |
| 인터랙션 훅 | `src/features/editor/sections/canvas/hooks/useDesignPaperInteraction.ts` |
| 컨텍스트 메뉴 | `src/features/editor/sections/canvas/DesignPaperContextMenu.tsx` |
| 스마트 가이드 오버레이 | `src/features/editor/sections/canvas/SmartGuideOverlay.tsx` |
| 변형 바 (회전/반전) | `src/features/editor/sections/canvas/ShapeTransformBar.tsx` |
