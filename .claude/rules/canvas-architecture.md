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

## 대형 컴포넌트 분리 기준

- 훅 10개 이상 또는 500줄 이상인 컴포넌트는 분리를 검토한다
- 렌더링 로직, 인터랙션 로직, 이벤트 핸들링을 하위 컴포넌트/훅으로 추출
- 현재 해당 파일: `DesignPaper.tsx` (609줄, 14+ 훅), `useDesignPaperInteraction.ts` (671줄)

## 관련 파일

| 역할 | 경로 |
|------|------|
| 페이지 스왑 스토어 | `src/features/editor/store/pageSwapStore.ts` |
| 통합 히스토리 스토어 | `src/features/editor/store/unifiedHistoryStore.ts` |
| 페이지 팩토리 | `src/features/editor/utils/pageFactory.ts` |
| 페이지 변경 유틸 | `src/features/editor/utils/pageMutation.ts` |
| 표 스토어 | `src/features/editor/store/tableStore.ts` |
| 인터랙션 훅 | `src/features/editor/sections/canvas/hooks/useDesignPaperInteraction.ts` |
