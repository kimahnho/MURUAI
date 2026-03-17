# Zustand 상태 관리 지침

## selector 기반 구독 (필수)

```typescript
// ❌ 금지: 전체 스토어 구독 (모든 상태 변경에 리렌더)
const store = useEditorStore();
const { tool, setTool, selectedIds } = useEditorStore();

// ✅ 권장: 필요한 값만 구독
const tool = useEditorStore((s) => s.tool);
const setTool = useEditorStore((s) => s.setTool);
```

## 파생값은 저장하지 않고 계산

```typescript
// ❌ 금지: 파생값을 상태로 저장
type State = {
  selectedIds: string[];
  hasSelection: boolean;  // 중복!
  selectionCount: number; // 중복!
};

// ✅ 권장: selector로 계산
const useHasSelection = () => useStore((s) => s.selectedIds.length > 0);
const useSelectionCount = () => useStore((s) => s.selectedIds.length);
```

## 스토어 분리 원칙

```
features/<feature>/store/   # feature 전용 스토어
shared/store/               # 전역 스토어 (인증 등)
```

- feature 스토어는 해당 feature 내에서만 사용
- 다른 feature에서 필요하면 shared로 승격

## 고빈도 업데이트 처리

```typescript
// ❌ 금지: 매 이벤트마다 store 업데이트
onPointerMove={(e) => setDragPosition({ x: e.clientX, y: e.clientY })}

// ✅ 권장: 로컬 상태로 처리, 완료 시에만 store 반영
const [localPos, setLocalPos] = useState({ x: 0, y: 0 });
onPointerMove={(e) => setLocalPos({ x: e.clientX, y: e.clientY })}
onPointerUp={() => store.setFinalPosition(localPos)}
```

## 액션 네이밍

```typescript
type State = {
  // 상태
  selectedIds: string[];
  tool: Tool;

  // 액션: set + 상태명
  setSelectedIds: (ids: string[]) => void;
  setTool: (tool: Tool) => void;

  // 복합 액션: 동사 + 명사
  clearSelection: () => void;
  toggleSelection: (id: string) => void;
};
```
