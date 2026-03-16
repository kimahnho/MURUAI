# 반응형 UI 지침

> 데스크탑 뷰에서 화면 크기가 줄어들더라도 텍스트 넘침, 레이아웃 깨짐을 방지하는 규칙.
> 모바일 UI는 고려하지 않는다. `sm:` 등 모바일 분기점 불필요.

## 필수 규칙

### 1. flex 컨테이너의 텍스트 오버플로 방지

```typescript
// ❌ 금지: 텍스트가 부모를 밀어냄
<div className="flex items-center gap-3">
  <Icon />
  <div>
    <span className="text-18-semibold">{title}</span>
  </div>
</div>

// ✅ 필수: min-w-0 + truncate
<div className="flex items-center gap-3">
  <Icon className="shrink-0" />
  <div className="min-w-0">
    <span className="text-18-semibold truncate">{title}</span>
  </div>
</div>
```

- **`min-w-0`**: flex 자식의 기본 `min-width: auto`를 해제하여 텍스트가 축소될 수 있게 함
- **`truncate`**: 한 줄 넘침 시 `...` 표시
- **`shrink-0`**: 아이콘/이미지 등 크기가 줄어들면 안 되는 요소에 적용

### 2. 아이콘/이미지 고정 크기에 shrink-0

```typescript
// ❌ 금지: 아이콘이 텍스트에 밀려 찌그러짐
<div className="flex items-center gap-3">
  <div className="w-12 h-12"><Icon /></div>
  <span>{longText}</span>
</div>

// ✅ 필수: shrink-0으로 크기 보호
<div className="flex items-center gap-3">
  <div className="w-12 h-12 shrink-0"><Icon /></div>
  <span className="min-w-0 truncate">{longText}</span>
</div>
```

### 3. 한 줄 유지가 필요한 텍스트

```typescript
// 배너/툴바 등 한 줄 유지 필수인 경우:
<span className="whitespace-nowrap">텍스트를 확인 후 이미지를 생성하세요</span>

// 넘치면 말줄임 허용:
<span className="truncate">긴 텍스트...</span>
```

### 4. 긴 텍스트 줄바꿈

```typescript
// 여러 줄 허용: wrap-break-word (Tailwind v4 정규 클래스)
<p className="wrap-break-word">{text}</p>

// ❌ 금지: break-words (Tailwind v4에서 비정규)
```

### 5. 동적 텍스트 버튼

```typescript
// 카운트, 진행률 등 동적 텍스트가 포함된 버튼:
<button className="flex items-center gap-2">
  {isLoading && <Loader2 className="h-4 w-4 shrink-0 animate-spin" />}
  <span className="truncate">{dynamicText}</span>
</button>
```

### 6. 사이드바 패널 텍스트

사이드바는 고정 너비(`w-82`)이므로 텍스트가 넘칠 수 있다:
- 카드 제목/설명에 `truncate` 적용
- 텍스트 컨테이너에 `min-w-0` 적용
- 아이콘 컨테이너에 `shrink-0` 적용

## 체크리스트 (구현 시 확인)

새 UI 컴포넌트 작성 시 아래 항목을 확인:

- [ ] flex 컨테이너 안 텍스트에 `min-w-0` + `truncate` 적용
- [ ] 고정 크기 요소(아이콘, 이미지)에 `shrink-0` 적용
- [ ] 한 줄 유지 필요 시 `whitespace-nowrap` 적용
- [ ] 동적 텍스트 버튼에 `truncate` 적용
- [ ] 사이드바 내 긴 텍스트에 overflow 처리 적용
