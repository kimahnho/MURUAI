# Table (표 요소) 지침

> 캔버스 위 표(Table) 요소의 생성/렌더링/사이드바 연동 규칙.

## 핵심 파일 위치

```
src/features/editor/sections/canvas/elements/table/
  TableBox.tsx                       # 표 캔버스 컴포넌트 (렌더링 + 드래그/리사이즈 + 셀 편집)

src/features/editor/sections/sidebar/content/
  TableContent.tsx                   # 표 속성 사이드바 패널 (행/열 +/- 편집)

src/features/editor/store/
  tableStore.ts                      # 선택된 표 요소 + updateTable 콜백 공유 스토어

src/features/editor/model/
  canvasTypes.ts                     # TableElement, TableCell 타입 정의

src/features/editor/utils/
  pageFactory.ts                     # addTableElement 함수

src/features/editor/hooks/
  useElementSubscription.ts          # "table" 분기 처리
  useEditorSubscriptions.ts          # addTableElement 파라미터 연결

src/features/editor/sections/canvas/hooks/
  useDesignPaperElementRenderer.tsx  # renderTableElement 함수 (table case)

src/features/editor/sections/sidebar/
  SideBar.tsx                        # MENU_LABELS/CONTENT_COMPONENTS에 "table" 등록
```

## 데이터 모델

```typescript
export type TableCell = {
  text: string;
};

export type TableElement = ElementBase & {
  type: "table";
  x: number;
  y: number;
  w: number;
  h: number;
  rows: number;
  cols: number;
  cells: TableCell[][];  // cells[rowIndex][colIndex]
};
```

## 요소 생성 플로우

1. `ElementContent.tsx` — "표" 버튼 클릭 → 팝업에서 행/열(1~20) 입력
2. 확인 클릭 → `useElementStore.requestTableElement(rows, cols)` 호출
3. `useElementSubscription` — `requestedType === "table"` 분기 → `addTableElement` 호출
4. `pageFactory.addTableElement` — 페이지 중앙 배치 (너비 60%, 셀 높이 `mmToPx(12)`)
5. `useDesignPaperElementRenderer.renderTableElement` — `<TableBox>` 렌더

## 사이드바 연동 패턴

- `"table"` 탭은 **좌측 아이콘 메뉴(`MENU_ITEMS`)에 없음** — 표 선택 시에만 자동 열림
- `MENU_LABELS`와 `CONTENT_COMPONENTS`에만 등록
- 사이드바 전환과 tableStore 동기화는 모두 `useEffect`에서 처리 — `onSelectChange` 콜백에서 직접 처리하지 않음

## tableStore 동기화 패턴 (확정)

```typescript
// useDesignPaperElementRenderer.tsx 훅 본체 (renderTableElement 함수 밖)
// selectedIds/elements 변화를 useMemo + useEffect로 감지해 tableStore와 사이드바를 동기화한다.
const selectedTableElement = useMemo(() => {
  if (selectedIds.length !== 1) return null;
  const el = elements.find((e) => e.id === selectedIds[0]);
  return el?.type === "table" ? (el as TableElement) : null;
}, [selectedIds, elements]);

useEffect(() => {
  if (selectedTableElement) {
    // 표 선택: 사이드바 "표" 탭 열기 + tableStore에 최신 데이터 등록
    setSideBarMenu("table");
    setSelectedTable(selectedTableElement, (patch) => {
      updateElement(selectedTableElement.id, patch);
    });
  } else {
    // 표 선택 해제: tableStore 초기화 → TableContent의 useEffect가 사이드바를 닫음
    setSelectedTable(null, null);
  }
}, [selectedTableElement, setSideBarMenu, setSelectedTable, updateElement]);
```

### 핵심 규칙

- **절대 금지**: `renderTableElement` 렌더 함수 내부에서 `setSelectedTable`/`setSideBarMenu` 직접 호출
  → 렌더 중 상태 업데이트 → 무한 루프 → 앱 먹통 발생
- `renderTableElement`는 순수하게 JSX만 반환하고 store 조작을 하지 않음
- `selectedTableElement`가 바뀔 때(선택/해제/데이터 변경) `useEffect`가 자동 실행
- `tableStore` null 설정 → `TableContent`의 `useEffect`가 감지 → `setSideBarMenu(null)` 호출

### useDesignPaperInteraction.ts 수정 사항 (드래그/리사이즈 지원)

표 요소는 `x/y`로 직접 위치를 관리하므로 두 경로에서 명시적으로 처리해야 함:

1. **`activeInteraction` 없는 초기 경로**: `"text" || "table"` 조건으로 `x/y` 업데이트
2. **`activeInteraction` 있는 fallthrough 경로**: `"table"` 전용 분기에서 `x/y/w/h` 모두 `updateElement` 호출

## 행/열 변경 규칙

- 행 추가: `cells` 배열에 `cols` 길이의 빈 행(`{ text: "" }`) 추가
- 행 삭제: `cells.slice(0, rows - 1)` (최솟값 1)
- 열 추가: 각 행에 `{ text: "" }` 셀 추가
- 열 삭제: 각 행에서 `row.slice(0, cols - 1)` (최솟값 1)
- 행/열 변경 시 항상 `rows`/`cols` 숫자와 `cells` 배열을 함께 업데이트해야 함

## 주의사항

1. **TableBox는 `usePointerDragSession` 기반** — 드래그/리사이즈 모두 이 훅 사용
2. **셀 편집은 `contentEditable`** — 더블클릭 → `contentEditable` div, `Escape`/`Enter` → blur
3. **리사이즈 핸들은 단일 선택 + 비편집 상태에서만 표시** — `isSelected && selectionCount === 1 && !editingCell`
4. **`cellWidth` 변수 불필요** — CSS Grid `1fr` 컬럼으로 균등 분배하므로 별도 계산 불필요
5. **`tableStore`는 에디터 캔버스 ↔ 사이드바 패널 간 선택 상태 공유 전용** — 다른 용도 사용 금지
