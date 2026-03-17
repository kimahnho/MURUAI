# 디자인 시스템 지침

> 컬러 팔레트, 공통 UI 컴포넌트, 사용 규칙. 모든 UI 작업 시 이 지침을 참고한다.

## 컬러 시스템

### Primary (violet-600 기반)

| 토큰 | 값 | 용도 |
|------|------|------|
| `primary-50` | `#f5f3ff` | 선택 배경, 카드 호버 |
| `primary-100` | `#ede9fe` | hover 배경, 뱃지 배경, 선택 상태 |
| `primary-200` | `#ddd6fe` | 보더, 링, 사이드바 활성 |
| `primary-300` | `#c4b5fd` | 비활성 강조, hover 보더 |
| `primary-400` | `#a78bfa` | 보조 강조 |
| `primary-500` | `#8b5cf6` | 밝은 primary |
| `primary` | `#7C3AED` | **기본** — 버튼, 텍스트, 보더 |
| `primary-700` | `#6d28d9` | hover/pressed 상태 |
| `primary-800` | `#5b21b6` | 진한 강조 |
| `primary-900` | `#4c1d95` | 최진함 |

### Black (기존 유지)

15단계 (`black-5` ~ `black-100`). 값과 네이밍 변경 없음.

### Status

| 카테고리 | 50 (배경) | 100 (hover 배경) | 기본 (500) | 700 (텍스트/강조) |
|----------|-----------|-------------------|------------|-------------------|
| Success | `#ecfdf5` | `#d1fae5` | `#22c55e` | `#15803d` |
| Warning | `#fffbeb` | `#fef3c7` | `#f59e0b` | `#b45309` |
| Error | `#fef2f2` | `#fee2e2` | `#ef4444` | `#b91c1c` |

### 컬러 사용 규칙

```typescript
// ✅ 올바른 방식: 팔레트 클래스 사용
className="bg-primary-50"
className="hover:bg-primary-700"
className="border-primary-200"
className="text-error-700"
className="bg-success-50"

// ❌ 금지: opacity 방식
className="bg-primary/5"
className="bg-primary/10"
className="hover:bg-primary/90"

// ❌ 금지: 하드코딩 hex
className="bg-[#7C3AED]"
className="text-[#5500ff]"
style={{ backgroundColor: "#5500ff" }}
```

**예외**: 인라인 스타일(`style={}`)에서 CSS 변수를 쓸 수 없는 경우(ex: 그라데이션, SVG)에만 hex 허용.

---

## 공통 UI 컴포넌트

### Button

```typescript
import Button from "@/shared/ui/Button";

// variant: "primary" | "secondary" | "outline" | "ghost" | "destructive"
// size: "sm" | "md" | "lg"
<Button variant="primary" size="md" onClick={handleSave}>저장</Button>
<Button variant="secondary" icon={<Plus className="h-4 w-4" />}>추가</Button>
<Button variant="outline" size="sm">취소</Button>
<Button variant="ghost" size="sm">닫기</Button>
<Button variant="destructive" onClick={handleDelete}>삭제</Button>
<Button isLoading>저장 중...</Button>
<Button fullWidth>전체 너비</Button>
```

| Variant | 기본 | Hover |
|---------|------|-------|
| `primary` | `bg-primary text-white-100` | `bg-primary-700` |
| `secondary` | `border-primary text-primary` | `bg-primary-50` |
| `outline` | `border-black-25 text-black-90` | `border-black-40 bg-black-5` |
| `ghost` | `text-black-70` | `bg-black-5` |
| `destructive` | `bg-error-50 border-error-100 text-error-700` | `bg-error-100` |

| Size | Padding | Typography |
|------|---------|------------|
| `sm` | `px-3 py-1.5` | `text-13-semibold rounded-lg` |
| `md` | `px-4 py-2.5` | `text-14-semibold rounded-xl` |
| `lg` | `px-6 py-3` | `text-title-16-semibold rounded-xl` |

### BaseModal

```typescript
import BaseModal from "@/shared/ui/BaseModal";

// size: "sm" | "md" | "lg" | "xl" | "full"
// backdrop: "blur" | "dark" | "none"
<BaseModal isOpen={isOpen} onClose={handleClose} title="모달 제목" size="lg" backdrop="dark">
  {/* 콘텐츠 */}
</BaseModal>
```

| Size | max-width | 용도 |
|------|-----------|------|
| `sm` | 384px | 확인 다이얼로그 |
| `md` | 448px | 기본 (폼, 알림) |
| `lg` | 512px | 설정, 미리보기 포함 |
| `xl` | 768px | 다중 페이지 선택 |
| `full` | 896px | 위자드 |

### ConfirmDialog

```typescript
import ConfirmDialog from "@/shared/ui/ConfirmDialog";

<ConfirmDialog
  isOpen={isOpen}
  onClose={handleClose}
  onConfirm={handleDelete}
  title="문서를 삭제하시겠어요?"
  description="삭제된 문서는 복구할 수 없습니다."
  confirmLabel="삭제"
  cancelLabel="취소"
  variant="danger"
/>
```

### Input

```typescript
import Input from "@/shared/ui/Input";

// size: "sm" | "md"
<Input label="이름" placeholder="이름을 입력하세요" isRequired />
<Input size="sm" error="필수 항목입니다" />
<Input leftIcon={<Search className="h-4 w-4" />} placeholder="검색..." />
```

### Textarea

```typescript
import Textarea from "@/shared/ui/Textarea";

<Textarea label="메모" placeholder="내용을 입력하세요" rows={4} isRequired />
<Textarea error="최소 10자 이상 입력해주세요" />
```

### Select

```typescript
import Select from "@/shared/ui/Select";

<Select
  label="카테고리"
  placeholder="선택하세요"
  options={[
    { value: "a", label: "옵션 A" },
    { value: "b", label: "옵션 B" },
  ]}
/>
```

### Badge

```typescript
import Badge from "@/shared/ui/Badge";

// variant: "default" | "primary" | "success" | "warning" | "error"
<Badge variant="success">완료</Badge>
<Badge variant="error">오류</Badge>
<Badge variant="primary">신규</Badge>
```

### Tabs

```typescript
import Tabs from "@/shared/ui/Tabs";

<Tabs
  items={[
    { id: "tab1", label: "탭 1" },
    { id: "tab2", label: "탭 2" },
  ]}
  activeId={activeTab}
  onTabChange={setActiveTab}
  fullWidth={false}  // false면 탭 너비가 콘텐츠에 맞춤
/>
```

### Spinner

```typescript
import Spinner from "@/shared/ui/Spinner";

// size: "sm" (h-4 w-4) | "md" (h-5 w-5) | "lg" (h-7 w-7)
<Spinner size="sm" />
```

### Toast

```typescript
import useToastStore from "@/shared/store/useToastStore";

// 사용: showToast 호출 (ToastProvider가 렌더링 담당)
useToastStore.getState().showToast("저장되었습니다");
useToastStore.getState().showToast("생성 완료!", "primary");
```

- `ToastProvider`가 `src/app/providers/ToastProvider.tsx`에서 구독 + 2초 자동 dismiss
- 앱 루트에 `<ToastProvider />` 마운트 필요

---

## 실수 방지

1. **opacity 패턴 금지** — `bg-primary/5`, `bg-primary/10`, `hover:bg-primary/90` 대신 `bg-primary-50`, `bg-primary-100`, `hover:bg-primary-700` 사용
2. **하드코딩 hex 금지** — `#5500ff`, `#7C3AED`, `#6D28D9` 등 직접 사용 금지. CSS 변수 클래스(`bg-primary`, `text-primary-700` 등) 사용
3. **버튼 인라인 스타일 금지** — `Button` 컴포넌트 사용. 인라인 `bg-primary rounded-xl px-4 py-3` 패턴 금지
4. **모달 직접 구현 금지** — `BaseModal` 또는 `ConfirmDialog` 사용. `fixed inset-0 z-9999` 직접 작성 금지
5. **shared/ui 규칙 준수** — 비즈니스 로직, Zustand store, API 호출, navigation 사용 금지. 모든 데이터는 props로 전달
6. **에디터 전용 UI는 건드리지 않음** — `ColorPickerPopover`, `InlineFontPicker`, `SquareToolBar` 등 캔버스 인터랙션 특화 컴포넌트는 디자인 시스템 대상이 아님
7. **토스트 에디터 전용 스토어** — `features/editor/store/toastStore.ts`는 에디터 전용. 공유 토스트는 `shared/store/useToastStore.ts` 사용

## 관련 파일

| 역할 | 경로 |
|------|------|
| 디자인 토큰 | `src/app/styles/global.css` |
| Button | `src/shared/ui/Button.tsx` |
| Spinner | `src/shared/ui/Spinner.tsx` |
| BaseModal | `src/shared/ui/BaseModal.tsx` |
| ConfirmDialog | `src/shared/ui/ConfirmDialog.tsx` |
| Input | `src/shared/ui/Input.tsx` |
| Textarea | `src/shared/ui/Textarea.tsx` |
| Select | `src/shared/ui/Select.tsx` |
| Badge | `src/shared/ui/Badge.tsx` |
| Tabs | `src/shared/ui/Tabs.tsx` |
| Toast | `src/shared/ui/Toast.tsx` |
| Toast 스토어 | `src/shared/store/useToastStore.ts` |
| Toast Provider | `src/app/providers/ToastProvider.tsx` |
