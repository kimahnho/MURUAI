# 하단 바 (레이어 인스펙터) 지침

> 페이지 썸네일 네비게이션, 레이어 순서, 접기/펼치기, 페이지 복사.

## 구조

`BottomBar.tsx` (858줄) — 가상 스크롤 모델 기반.

### 아이템 모델

```typescript
type BottomBarItem =
  | { type: "page"; page: Page }
  | { type: "divider"; id: string }
  | { type: "add" };
```

- 페이지 사이마다 divider 삽입 (드래그 앤 드롭 대상)
- 마지막에 add 버튼

## 접기/펼치기

- `isCollapsed`: 로컬 state + `sessionStorage("bottomBarCollapsed")`
- **접힘**: `h-8` (32px), 내용 숨김
- **펼침**: `h-40` (160px)
- 토글 버튼: `absolute -top-5 left-1/2` (border 위 오버랩)

## 페이지 선택

- `selectedPageIds[]`: Shift/Cmd 다중 선택 (활성 `selectedPageId`와 별개)
- 클릭: 단일 선택 + 활성 페이지 변경
- Shift+클릭: 범위 선택
- Cmd/Ctrl+클릭: 토글 선택

## 키보드 단축키

| 키 | 동작 |
|----|------|
| Ctrl/Cmd+C | 선택 페이지 복사 |
| Ctrl/Cmd+V | 활성 페이지 뒤에 붙여넣기 |
| ←/→ | 페이지 네비게이션 |

## 맞춤법 검사 연동

- `spellCheckStore.isPanelOpen`이 true일 때 썸네일에 에러 카운트 뱃지 표시
- 미적용 교정 수 = 해당 페이지의 results 중 `actionMap`에서 `"applied"` 아닌 항목 수

## 관련 파일

| 역할 | 경로 |
|------|------|
| 하단 바 | `src/features/editor/sections/bottombar/BottomBar.tsx` |
| 드래그 훅 | `src/features/editor/sections/bottombar/useBottomBarDrag.ts` |
| 스크롤 훅 | `src/features/editor/sections/bottombar/useBottomBarScroll.ts` |
