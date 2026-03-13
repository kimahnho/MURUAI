---
paths:
  - "src/features/editor/sections/canvas/elements/table/**"
  - "src/features/editor/sections/sidebar/content/TableContent.tsx"
  - "src/features/editor/store/tableStore.ts"
  - "src/features/editor/sections/canvas/hooks/useDesignPaperElementRenderer.tsx"
---

# Table (표 요소) 지침

> 캔버스 위 표(Table) 요소의 생성/렌더링/사이드바 연동 규칙.

## 핵심 파일 위치

```
src/features/editor/sections/canvas/elements/table/
  TableBox.tsx                       # 표 캔버스 컴포넌트 (렌더링 + 드래그/리사이즈 + 셀 편집 + 열/행 분리선 리사이즈)

src/features/editor/sections/sidebar/content/
  TableContent.tsx                   # 표 속성 사이드바 패널 (행/열, 테두리, 빗금, 텍스트 스타일)

src/features/editor/store/
  tableStore.ts                      # 선택된 표 요소 + updateTable 콜백 공유 스토어

src/features/editor/model/
  canvasTypes.ts                     # TableElement, TableCell, TableCellStyle, TableBorderConfig, CellDiagonal 타입

src/features/editor/utils/
  tableMutation.ts                   # 셀 기준 행/열 삽입·삭제 순수 유틸 (컨텍스트 메뉴 + 사이드바 공유)
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

### 테두리 타입

```typescript
export type TableBorderStyle = "solid" | "dashed" | "dotted";

export type TableBorderLine = {
  color: string;
  width: number;
  style: TableBorderStyle;
};

export type TableBorderConfig = {
  outer?: TableBorderLine | null;      // 외곽 4변 (null = 없음)
  horizontal?: TableBorderLine | null;  // 내부 가로선 (행 사이)
  vertical?: TableBorderLine | null;    // 내부 세로선 (열 사이)
};
```

### 빗금 타입

```typescript
export type CellDiagonal = "backslash" | "slash" | "cross";
// backslash: 좌상→우하 (\), slash: 우상→좌하 (/), cross: 양쪽 (X)
```

### 셀 스타일

```typescript
export type TableCellStyle = {
  fontSize: number;                      // 기본값 13
  fontFamily?: string;
  alignX: "left" | "center" | "right";  // 기본값 "center"
  fontWeight?: "normal" | "bold" | number;
  color?: string;                        // 기본값 "#000000"
  italic?: boolean;
  underline?: boolean;
  backgroundColor?: string;              // 셀 배경색 (undefined = 투명)
  diagonal?: CellDiagonal | null;        // 빗금 방향
};
```

### 셀 및 테이블 요소

```typescript
export type TableCell = {
  text: string;
  style?: TableCellStyle;  // 개별 셀 스타일 (없으면 element.cellStyle → 기본값 순으로 fallback)
};

export type TableElement = ElementBase & {
  type: "table";
  x: number;
  y: number;
  w: number;
  h: number;
  rows: number;
  cols: number;
  cells: TableCell[][];
  colWidths?: number[];              // 각 열 너비 (px, 합계 = w). undefined = 균등 분배
  rowHeights?: number[];             // 각 행 높이 (px, 합계 = h). undefined = 균등 분배
  cellStyle?: TableCellStyle;        // 표 전체 기본 스타일
  borderConfig?: TableBorderConfig;  // undefined = 기본값(1px solid #000000 전체)
  diagonalColor?: string;            // 빗금 색상 (테이블 일괄, 기본값 "#000000")
};
```

### 셀 스타일 Fallback 체인

```
cell.style → element.cellStyle → 기본값(fontSize=13, alignX="center", color="#000000")
```

선택된 셀에 스타일 적용 시 `updateStylePatch` 함수 사용:
- `selectedCells.length > 0`: 선택된 셀에만 개별 `cell.style` 적용
- `selectedCells.length === 0`: 표 전체 `cellStyle` 변경 + 개별 style이 있는 셀에도 patch 적용

## 테두리 커스터마이징

### 3채널 시스템

| 채널 | 역할 | null 의미 |
|------|------|----------|
| `outer` | 외곽 4변 | 외곽선 없음 |
| `horizontal` | 내부 가로선 (행 사이) | 가로선 없음 |
| `vertical` | 내부 세로선 (열 사이) | 세로선 없음 |

### 렌더링 방식 (TableBox.tsx 오버레이 레이어)

셀 그리드 위에 `position: absolute` + `pointerEvents: none` 레이어로 렌더:

- **외곽 테두리**: CSS `outline` + `outlineOffset: -width/2` — box model 밖에 그려져 내부 공간 불변
- **내부 가로선**: `borderTop` + `transform: translateY(-width/2)` — 셀 경계 중앙 배치
- **내부 세로선**: `borderLeft` + `transform: translateX(-width/2)` — 셀 경계 중앙 배치

```typescript
// ❌ 금지: border + box-sizing (외곽이 내부 공간을 잠식)
<div style={{ border: outerBorder, boxSizing: "border-box" }} />

// ✅ 올바른 방식: outline (내부 공간 불변)
<div style={{ outline: outerBorder, outlineOffset: -outerWidth / 2 }} />
```

### 사이드바 UI (TableContent.tsx)

- **5개 위치 타겟**: 전체, 외곽, 내부, 가로선, 세로선
- **4개 스타일**: 없음(Ban), 실선, 점선, 대시선
- **색상**: ColorPickerPopover
- **두께**: range(1-20) + 숫자 입력

## 빗금(대각선)

### 데이터

- 방향: `cell.style.diagonal` — 셀 단위 (`"backslash"` / `"slash"` / `"cross"` / null)
- 색상: `element.diagonalColor` — 테이블 단위 일괄 적용

### 렌더링 (TableBox.tsx SVG 오버레이)

```typescript
// 빗금이 하나라도 있을 때만 SVG 렌더
<svg style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
  {/* 각 셀의 diagonal 값에 따라 <line> 렌더 */}
  {/* backslash: (cx, cy) → (cx+cw, cy+ch) */}
  {/* slash: (cx+cw, cy) → (cx, cy+ch) */}
</svg>
```

### 사이드바 UI (셀 선택 시에만 표시)

- `╲` / `╱` 토글 버튼: 둘 다 활성 = cross(X)
- 해제 버튼 (Ban 아이콘)
- 색상 피커: `updateTable({ diagonalColor })` — 테이블 레벨

### 토글 동작

| 현재 상태 | `╲` 클릭 | `╱` 클릭 |
|-----------|---------|---------|
| 없음 | backslash | slash |
| backslash | 해제 | cross |
| slash | cross | 해제 |
| cross | slash | backslash |

## 셀 선택 스타일링

다중 셀 선택 시 **외곽 변만 2px 테두리**, 내부 경계에는 테두리 없음:

```typescript
// 인접 셀이 선택되지 않은 변에만 2px inset boxShadow
const hasTop = selectedCells.some((c) => c.row === rowIndex - 1 && c.col === colIndex);
if (!hasTop) shadows.push("inset 0 2px 0 0 #5500ff");
// ... 4방향 각각 판별
shadows.push("inset 0 0 0 9999px rgba(85, 0, 255, 0.08)");  // 배경 틴트
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
    setSideBarMenu("table");
    setSelectedTable(selectedTableElement, (patch) => {
      updateElement(selectedTableElement.id, patch);
    });
  } else {
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

## 열/행 개별 크기 조절

### colWidths / rowHeights 관리 규칙

- `undefined` → 균등 분배 (TableBox 내 `resolveColWidths`/`resolveRowHeights` 헬퍼가 처리)
- `resolveColWidths`/`resolveRowHeights`: 합계가 w/h와 다르면 비례 보정
- 분리선 드래그 시 `onColWidthsChange(colWidths)` / `onRowHeightsChange(rowHeights)` 콜백 → `updateElement` 호출
- `gridTemplateColumns` / `gridTemplateRows`는 `repeat(n, 1fr)` 대신 실제 px 값 배열로 구성

### 분리선 드래그 구현 (TableBox.tsx)

- 히트 영역: 열/행 경계 좌우/상하 각 `DIVIDER_HIT(6px)`
- 인접한 두 열(행)의 합계 크기는 유지하고 비율만 조정 (최솟값 10px)
- hover 시 `var(--primary)` 2px 라인 표시 (0.1s transition), 선택 + 단일 + 비편집 상태에서만 노출
- `zIndex`: 분리선 핸들 10, 리사이즈 핸들 20 (겹침 방지)

### 행/열 변경 규칙 (colWidths/rowHeights 보존 + 표 크기 변경)

행/열 추가·삭제 시 `colWidths`/`rowHeights`가 있으면 반드시 함께 업데이트해야 기존 간격이 유지된다.

- **행 추가**: `rowHeights`가 있으면 기존 평균 높이를 새 항목으로 추가. **표 전체 `h`도 새 행 높이만큼 증가**
- **행 삭제**: `rowHeights`가 있으면 마지막 항목 제거. **표 전체 `h`도 삭제된 행 높이만큼 감소**
- **열 추가**: `colWidths`가 있으면 기존 평균 너비를 새 항목으로 추가. 표 전체 `w`는 변경하지 않음
- **열 삭제**: `colWidths`가 있으면 마지막 항목 제거. 표 전체 `w`는 변경하지 않음
- `colWidths`/`rowHeights`가 `undefined`이면 추가·삭제 후에도 `undefined` 유지 (균등 분배 유지)

### 간격 동일 버튼 (TableContent.tsx)

- `colWidths`가 설정된 경우에만 **"열 간격 동일"** 버튼 표시 → `updateTable({ colWidths: undefined })`
- `rowHeights`가 설정된 경우에만 **"행 간격 동일"** 버튼 표시 → `updateTable({ rowHeights: undefined })`

## 혼합값 감지 (TableContent.tsx)

선택된 셀들의 스타일이 서로 다를 때 UI에 표시:

```typescript
// isMixedStyleField("color"): 대상 셀들의 color 값이 다르면 true
// collectUniqueColors("backgroundColor"): 고유 색상 목록 수집
const targetCells = selectedCells.length > 0
  ? selectedCells.map((c) => cells[c.row]?.[c.col]).filter(Boolean)
  : cells.flat();
```

## 셀 기준 행/열 삽입·삭제 (`tableMutation.ts`)

셀 선택 상태에서 선택된 셀을 기준으로 행/열을 삽입·삭제하는 순수 유틸리티.
컨텍스트 메뉴(우클릭 → "표 편집" 서브메뉴)와 사이드바(TableContent "셀 기준 편집" 섹션) 양쪽에서 공유한다.

### 함수 목록

| 함수 | 역할 |
|------|------|
| `insertRowAt(table, rowIndex)` | rowIndex 위치에 빈 행 삽입 (rowHeights + h 조정) |
| `insertColAt(table, colIndex)` | colIndex 위치에 빈 열 삽입 (colWidths 조정, w 유지) |
| `deleteRowAt(table, rowIndex)` | rowIndex 행 삭제 (rows ≤ 1이면 null 반환) |
| `deleteColAt(table, colIndex)` | colIndex 열 삭제 (cols ≤ 1이면 null 반환) |
| `adjustCellsAfterInsertRow` | 삽입 후 selectedCells 행 좌표 보정 |
| `adjustCellsAfterInsertCol` | 삽입 후 selectedCells 열 좌표 보정 |
| `adjustCellsAfterDeleteRow` | 삭제 후 selectedCells 보정 (삭제 행만 선택 시 인접 행 fallback) |
| `adjustCellsAfterDeleteCol` | 삭제 후 selectedCells 보정 (삭제 열만 선택 시 인접 열 fallback) |

### 컨텍스트 메뉴 연동 (DesignPaper.tsx)

- `buildTableContext()` 함수가 6개 핸들러를 생성해 `DesignPaperContextMenu`에 `tableContext` prop으로 전달
- 각 핸들러는 `useTableStore.getState()`로 최신 상태를 읽고, mutation → selectedCells 보정 → 메뉴 닫기 순서로 실행

### 우클릭 셀 자동 선택 (TableBox.tsx)

- 표가 이미 선택된 상태에서 우클릭 → `hitCellFromPointer`로 셀 식별 → 미선택 셀이면 `setSelectedCells([clickedCell])`
- 이미 선택된 셀을 우클릭하면 기존 선택 유지

## 행/열 헤더 버튼 (TableBox.tsx)

- **열 헤더**: 선택된 셀의 열에 해당하는 버튼을 표 **상단 바깥**에 표시
- **행 헤더**: 선택된 셀의 행에 해당하는 버튼을 표 **좌측 바깥**에 표시
- 표시 조건: `isSelected && selectedCells.length > 0`
- 클릭 시 해당 행/열 전체 선택
- 전체 선택 시 primary 배경색으로 하이라이트

## 주의사항

1. **TableBox는 `usePointerDragSession` 기반** — 드래그/리사이즈/분리선 모두 이 훅 사용
2. **셀 편집은 `contentEditable`** — 표 선택 상태에서 셀 클릭 → 편집 진입 (첫 클릭은 요소 선택만, 두 번째 클릭부터 셀 선택). `Escape`/`Enter` → blur
3. **리사이즈·분리선 핸들은 단일 선택 상태에서 표시** — `isSelected && selectionCount === 1` (편집 중에도 표시)
4. **`tableStore`는 에디터 캔버스 ↔ 사이드바 패널 간 선택 상태 공유 전용** — 다른 용도 사용 금지
5. **행/열 추가·삭제 시 `colWidths`/`rowHeights` 반드시 함께 업데이트** — 누락 시 기존 간격이 균등으로 리셋됨
6. **셀 기준 삽입·삭제 후 selectedCells 보정 필수** — `adjustCellsAfter*` 함수로 좌표 이동/fallback 처리
7. **외곽 테두리는 `outline` 사용** — `border` + `box-sizing: border-box` 금지 (내부 공간 잠식)
8. **내부선은 `translate` 중앙 배치** — `translateY(-width/2)` / `translateX(-width/2)`로 셀 경계 중심에 위치
