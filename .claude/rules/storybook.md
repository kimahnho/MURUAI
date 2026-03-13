---
paths:
  - "src/features/storybook/**"
---

# Storybook (AI 스토리북 생성기) 지침

> 아동 맞춤형 10페이지 그림책을 AI로 생성하는 6단계 위자드.

## 핵심 파일 위치

```
src/features/storybook/
  components/
    StorybookWizardModal.tsx      # 모달 컨테이너 (좌측 위자드 + 우측 프리뷰)
    StorybookWizard.tsx           # 6단계 위자드 컨트롤러
    PagePreviewPanel.tsx          # 4단계 우측 A4 프리뷰
    steps/
      ChildInfoStep.tsx           # 1단계: 아동 정보 (선택/직접 입력)
      TopicStep.tsx               # 2단계: 주제 입력
      ProposalStep.tsx            # 3단계: 기획서 선택/수정
      ArtStyleStep.tsx            # 4단계: 그림체/폰트/레이아웃
      GeneratingStep.tsx          # 5단계: 생성 중 + 이미지 진행 상황 표시
      CompleteStep.tsx            # 6단계: 완료 결과
  store/
    useStorybookWizardStore.ts    # Zustand 위자드 상태 (imageProgress 포함)
  model/
    storybookTypes.ts             # 타입 + 상수 정의
    storybookValidation.ts        # 단계별 유효성 검증
  ai/
    generateStoryProposals.ts    # AI 기획서 생성 (Gemini 2.5-flash)
    generateStorybook.ts         # 스토리북 생성 오케스트레이터
    generateStoryImages.ts       # 장면 이미지 생성 (Gemini 2.5-flash-image)
  utils/
    buildStoryPages.ts           # StoryBook → Page[] 변환
  data/
    artStylePresets.ts            # 그림체 5종 프리셋 + 프롬프트
    studentService.ts             # 학습자 목록 Supabase 쿼리
    mockStoryService.ts           # Mock 기획서 + 스토리북 생성 (프로토타입/테스트용)
```

## 진입점

- 사이드바 `"ai-template"` 탭 → `AiTemplateContent.tsx` → "AI 스토리북" 카드 클릭 → `StorybookWizardModal`

## 6단계 위자드 흐름

```
1. 아동 정보 → 2. 주제 입력 → [fetchProposals] → 3. 기획서 선택
→ 4. 스타일 설정 → [generateBook] → 5. 생성 중 → 6. 완료
```

- Step 2 → 3: `fetchProposals()` → `generateStoryProposals()` (Gemini 2.5-flash)
- Step 4 → 5 → 6: `generateBook()` → `generateStorybook()` → `generateStoryImages()` (Gemini 2.5-flash-image) → `buildStoryPages()` → `requestInsertPages()`

## 핵심 타입

```typescript
interface ChildInfo {
  id: string;
  studentId?: string;          // students_n 연결
  name: string;
  gender: "male" | "female";
  age: number;
  diagnosis?: string;           // 선택
  learningGoal?: string;        // 선택
}

interface StoryProposal {
  id: string;
  title: string;
  summary: string;
  pages: StoryPageOutline[];    // 10페이지
}

interface WizardFormData {
  childInfo: ChildInfo | null;
  topic: string;
  layout: PageLayout;           // "vertical" | "horizontal"
  fontFamily: string;
  selectedProposalId: string | null;
  proposals: StoryProposal[];
  artStyle: ArtStyleId | null;
  editedProposal: StoryProposal | null;
}

type ArtStyleId =
  | "watercolor-fairytale"
  | "pixar-style"
  | "cozy-sketch"
  | "crayon-sketch"
  | "minimal-illustration";
```

## 상수

- `STORYBOOK_PAGE_COUNT = 10`
- `TOPIC_PRESETS`: 6개 추천 주제
- `DEFAULT_FONT_FAMILY = "Pretendard"`
- `TOPIC_MIN_LENGTH = 2`, `TOPIC_MAX_LENGTH = 200`

## 의존성 규칙

- `features/home` import 금지 → `studentService.ts`에서 Supabase 직접 쿼리
- `studentService.ts`: `gender` 컬럼 없을 경우 fallback 재시도 로직 포함

## ChildInfoStep 이중 모드

- **모드 A "내 학습자"**: `fetchStudentsForWizard()` → 카드 선택 → gender 없으면 보충 UI
- **모드 B "직접 입력"**: 이름(필수), 성별(필수), 나이(필수), 진단명(선택), 학습목표(선택)
- 학습자 0명이면 자동으로 모드 B 전환

## AI 이미지 생성 파이프라인

### 모델 및 설정

- **텍스트 생성**: `gemini-2.5-flash` (`@google/genai` SDK)
- **이미지 생성**: `gemini-2.5-flash-image`, `imageConfig: { aspectRatio: "16:9" }`

### 2단계 파이프라인 (`generateStoryImages.ts`)

```
Phase 1: 10장 base64 이미지 수집 (하나라도 실패 시 throw — Cloudinary 비용 방지)
Phase 2: 일괄 Cloudinary 업로드 → URL 배열 반환
```

- **한→영 번역**: `translateScenesToEnglish()` — 10개 장면을 1회 Gemini 호출로 일괄 번역 (실패 시 한국어 fallback)
- **재시도**: `MAX_RETRIES = 3`, `RETRY_DELAY_MS = 2000`
- **Cloudinary 폴더**: `muru_storybook_gen/{userId}`

### Progress 콜백

```typescript
generateStoryImages(pages, artStyleId, onProgress?): Promise<string[]>
// onProgress(current, total) — 이미지 1장 생성 완료마다 호출
```

- store: `imageProgress: { current: number; total: number } | null`
- `GeneratingStep`에서 `"이미지 생성 중 (3/10)"` 형태로 표시

## 페이지 레이아웃 상수 (`buildStoryPages.ts`)

| 항목 | 세로형 | 가로형 |
|------|--------|--------|
| A4 크기 | 792×1122px | 1122×792px |
| 이미지:텍스트 분할 | 상단 50% : 하단 50% | 좌측 50% : 우측 50% |
| fontSize | 36 | 32 |
| lineHeight | 1.8 | 1.8 |

- `MM_TO_PX = 3.7795` (mm → px 변환 상수)
- `IMAGE_NATURAL_W = 1024`, `IMAGE_NATURAL_H = 576` (Gemini 16:9 출력 기준)
- 모든 페이지 생성 시 `withLogoCanvasElements()` 필수 래핑
- 캔버스 삽입: `useTemplateStore.requestInsertPages(pages)`

## 현재 상태

- ✅ Gemini API 연동 완료 (기획서 생성 + 이미지 생성)
- ✅ 16:9 이미지 생성 + Cloudinary 업로드 구현 (Phase 1/2 파이프라인)
- ✅ 에디터 캔버스 삽입 구현 (`requestInsertPages()`)
- ✅ Progress callback + UI 표시 ("이미지 생성 중 3/10")
- ❌ DB 저장 미구현 — 스토어에만 존재

## 주의사항

1. **structuredClone**: `selectProposal`에서 기획서 deep clone 시 사용
2. **crypto.randomUUID()**: 모든 ID 생성에 사용
3. **소프트 삭제 필터**: `studentService.ts`에서 `.is("deleted_at", null)` 필수
4. **소유권 필터**: `.eq("user_id", session.user.id)` 필수
5. **모달 닫기 방지**: 생성 중(`isLoading`) 닫기 버튼 비활성화
6. **Phase 1 실패 시 throw**: base64 수집 중 실패하면 Cloudinary 업로드를 시도하지 않음 (비용 방지)
7. **이미지 aspectRatio**: `"16:9"` 유지 필수
8. **한→영 번역 실패**: fallback으로 한국어 사용 (throw 아님)

## 관련 파일

| 역할 | 경로 |
|------|------|
| 모달 컨테이너 | `src/features/storybook/components/StorybookWizardModal.tsx` |
| 위자드 컨트롤러 | `src/features/storybook/components/StorybookWizard.tsx` |
| A4 프리뷰 | `src/features/storybook/components/PagePreviewPanel.tsx` |
| Zustand 상태 | `src/features/storybook/store/useStorybookWizardStore.ts` |
| 타입 + 상수 | `src/features/storybook/model/storybookTypes.ts` |
| 유효성 검증 | `src/features/storybook/model/storybookValidation.ts` |
| AI 기획서 생성 | `src/features/storybook/ai/generateStoryProposals.ts` |
| AI 오케스트레이터 | `src/features/storybook/ai/generateStorybook.ts` |
| AI 이미지 생성 | `src/features/storybook/ai/generateStoryImages.ts` |
| 페이지 빌더 | `src/features/storybook/utils/buildStoryPages.ts` |
| 그림체 프리셋 | `src/features/storybook/data/artStylePresets.ts` |
| 학습자 쿼리 | `src/features/storybook/data/studentService.ts` |
