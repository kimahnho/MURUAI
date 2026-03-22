# 맞춤법 검사 지침

> AI 기반 한국어 맞춤법/띄어쓰기/문법 검사, 교정 적용, UI 패널.

## 아키텍처

```
ExportModal "맞춤법 검사" 버튼
  → spellCheckStore.requestCheck()
    → checkSpelling(pages) — Gemini 2.5 Flash
      → SpellCheckResult[] 반환
        → SpellCheckPanel에서 교정 선택
          → applySpellCorrections(pages, results) — 비파괴 적용
```

## AI 검사 (`checkSpelling.ts`)

- **모델**: `gemini-2.5-flash`
- **배치 크기**: `BATCH_SIZE = 50` — 텍스트 항목을 50개씩 분할 호출
- **대상**: 텍스트 요소(`text`), 도형 내 텍스트, 테이블 셀(`cell-{row}-{col}`)
- **프롬프트**: 한국어 맞춤법/띄어쓰기/문법 검사 → JSON 배열 반환

### 타입

```typescript
type SpellCorrection = { original: string; corrected: string; reason: string };
type SpellCheckResult = {
  elementId: string;
  pageId: string;
  pageNumber: number;
  field: string;         // "text" | "cell-{row}-{col}"
  corrections: SpellCorrection[];
};
```

## 스토어 (`spellCheckStore`)

| 상태 | 타입 | 용도 |
|------|------|------|
| `results` | `SpellCheckResult[] \| null` | 검사 결과 |
| `isChecking` | `boolean` | 검사 진행 중 |
| `isPanelOpen` | `boolean` | 패널 표시 여부 |
| `actionMap` | `Map<string, "applied" \| "ignored">` | 교정별 처리 상태 |
| `recheckRequested` | `number` | 재검사 트리거 |

### 교정 키 형식

```typescript
buildCorrectionKey(elementId, field, correctionIdx)
// → "${elementId}::${field}::${correctionIdx}"
```

## 교정 적용 (`applySpellCorrections`)

- `applyCorrections(pages, results)`: 불변 `Page[]` 반환
- 텍스트 요소 + 도형 텍스트 + 테이블 셀 지원
- `replaceAll()`로 순서 무관 텍스트 패칭
- `actionMap`에서 `"applied"` 상태인 교정만 적용

## 텍스트 추출 규칙

- **`locked` 요소 제외**: 템플릿 고정 요소(`el.locked === true`)는 맞춤법 검사에서 자동 제외. "월", "일", "요일" 등 템플릿 레이블이 검사 대상에 포함되지 않음.
- 빈 문자열(`text.trim() === ""`)은 제외
- 테이블 셀: 각 셀을 `cell-{row}-{col}` 필드로 개별 추출
- **감정추론 페이지 마킹**: `subType === "emotionInference"` 요소가 있는 페이지의 텍스트에 `isEmotionInference: true` 플래그 → 프롬프트에서 종속절(~서, ~며, ~고) 교정 제외

## 실수 방지

1. **배치 크기 초과 금지** — 50개 초과 시 자동 분할
2. **필드명 리터럴 매칭** — `"text"` vs `"cell-{row}-{col}"` 정확히 구분
3. **빈 배열 반환 시 패널 미표시** — 결과 없으면 토스트만

## 관련 파일

| 역할 | 경로 |
|------|------|
| AI 검사 | `src/features/editor/ai/checkSpelling.ts` |
| 스토어 | `src/features/editor/store/spellCheckStore.ts` |
| 교정 적용 | `src/features/editor/utils/applySpellCorrections.ts` |
| 텍스트 추출 | `src/features/editor/utils/spellCheckTextExtractor.ts` |
| UI 패널 | `src/features/editor/shared/SpellCheckPanel.tsx` |
| 토스트 | `src/features/editor/shared/SpellCheckToast.tsx` |
| 진입점 | `src/features/editor/shared/ExportModal.tsx` |
