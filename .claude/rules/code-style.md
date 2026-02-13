# 코드 스타일 지침

## TypeScript

### import 순서
```typescript
// 1. React/외부 라이브러리
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// 2. 내부 모듈 (@/ 경로)
import { supabase } from '@/shared/supabase/supabase';
import { useEditorStore } from '@/features/editor/store/...';

// 3. 상대 경로
import { MyComponent } from './MyComponent';
import type { MyType } from '../types';
```

### 타입
```typescript
// 타입 import는 type 키워드 사용
import type { CanvasElement } from './canvasTypes';

// interface vs type
interface Props { ... }  // 컴포넌트 props, 확장 가능한 객체
type Status = 'loading' | 'error' | 'success';  // union, 유틸리티 타입
```

### 네이밍
```typescript
// 컴포넌트: PascalCase
const MyComponent = () => { ... };

// 훅: use 접두사 + camelCase
const useMyHook = () => { ... };

// 이벤트 핸들러: handle 또는 on 접두사
const handleClick = () => { ... };
onPointerDown={(e) => { ... }}

// 상수: SCREAMING_SNAKE_CASE
const MAX_ZOOM_LEVEL = 3;

// boolean: is/has/should 접두사
const isLoading = true;
const hasSelection = selectedIds.length > 0;
```

## React

### 컴포넌트 정의
```typescript
// arrow function 사용
const MyComponent = () => {
  return <div>...</div>;
};

// Props 타입은 컴포넌트 바로 위에
interface MyComponentProps {
  title: string;
  onClose: () => void;
}

const MyComponent = ({ title, onClose }: MyComponentProps) => { ... };
```

### memo/useCallback 사용 기준
```typescript
// ❌ 금지: 습관적 사용 (React Compiler가 처리)
const MemoizedComponent = memo(({ data }) => <div>{data}</div>);
const handler = useCallback(() => { ... }, []);

// ✅ 허용: 명확한 근거가 있을 때만
// - 참조 동일성이 필수인 경우 (dependency array, 외부 라이브러리)
// - 프로파일링으로 확인된 성능 병목
```

### 조건부 렌더링
```typescript
// 단순 조건: &&
{isVisible && <Modal />}

// 양자택일: 삼항
{isLoading ? <Spinner /> : <Content />}

// 복잡한 조건: 변수 분리 또는 early return
const content = (() => {
  if (isLoading) return <Spinner />;
  if (error) return <Error />;
  return <Content />;
})();
```

## 주석

### 원칙
- **최소화** - 코드가 자명해야 함
- **Why + Role 중심** - 왜 필요한지와 이 코드가 어떤 역할/동작을 담당하는지 설명
- **What 허용 조건** - 로직 흐름/상태 전이/이벤트 처리처럼 코드만으로 맥락 파악이 어려울 때는 동작 설명 주석 허용
- **UI 예외 원칙** - UI 블록은 배치 설명이 아닌 "사용자 관점 기능"을 짧게 설명
- **파일 헤더 원칙** - 훅(`use*.ts`)과 페이지 컴포넌트 파일 상단에는 파일 책임을 1-2줄로 명시

### 금지
```typescript
// ❌ 코드로 자명한 내용
// 버튼 클릭 핸들러
const handleClick = () => { ... };

// ❌ 스타일/레이아웃만 설명하는 주석
// 상단 정렬 + 좌우 패딩
<div className="flex items-center px-4" />

// ❌ 주석 처리된 코드 (삭제할 것)
// const oldFunction = () => { ... };
```

### 허용
```typescript
// ✅ shared 유틸에만 JSDoc
/**
 * 캔버스 좌표를 페이퍼 좌표로 변환
 * @param clientX - 클라이언트 X 좌표
 * @param scale - 현재 줌 스케일
 * @returns 페이퍼 좌표계 위치
 */
export function clientToPaper(clientX: number, scale: number): number { ... }

// ✅ 외부 노출 Props/interface만 문서화
/** 캔버스 요소 공통 Props */
interface ElementProps {
  /** 요소 고유 ID */
  id: string;
  /** 읽기 전용 모드 */
  readOnly?: boolean;
}

// ✅ 비직관적인 로직 설명
// Safari에서 pointer capture가 작동하지 않아 document 레벨 이벤트 사용
document.addEventListener('pointermove', handleMove);

// ✅ 훅/핸들러 역할 설명
// 다중 선택 박스의 클릭/드래그를 구분해 클릭이면 단일 선택, 드래그면 그룹 이동을 수행
const handleGroupOverlayDragPointerDown = () => { ... };

// ✅ 파일 상단 역할 설명 (훅/페이지)
/**
 * 에디터 변경사항을 디바운스 기반으로 자동 저장하고
 * 수동 저장 상태를 함께 관리하는 훅.
 */
export const useAutoSave = () => { ... };

// ✅ UI 블록 역할 설명
// 좌측 아이콘 메뉴: 편집 도구 카테고리 전환
<aside>{...}</aside>

// ✅ UI 결과/행동 설명
// 생성 결과 목록: 이미지를 클릭하면 캔버스에 새 요소로 삽입
<GeneratedImageGrid ... />
```

## CSS (Tailwind)

### 클래스 순서
```tsx
// 1. 레이아웃 (display, position, flex)
// 2. 크기 (width, height, padding, margin)
// 3. 시각적 (background, border, shadow)
// 4. 타이포그래피 (font, text)
// 5. 상태 (hover, focus, transition)

<div className="flex items-center justify-between w-full px-4 py-2 bg-white border rounded-lg text-14-regular hover:bg-gray-50 transition" />
```

### 커스텀 클래스
```tsx
// 프로젝트 정의 유틸리티 클래스 사용
text-14-regular    // font-size + line-height + font-weight
text-title-16-semibold
text-black-50      // 커스텀 컬러
```
