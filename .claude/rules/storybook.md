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
      GeneratingStep.tsx          # 5단계: 생성 중 애니메이션
      CompleteStep.tsx            # 6단계: 완료 결과
  store/
    useStorybookWizardStore.ts    # Zustand 위자드 상태
  model/
    storybookTypes.ts             # 타입 + 상수 정의
    storybookValidation.ts        # 단계별 유효성 검증
  data/
    mockStoryService.ts           # Mock AI 서비스 (프로토타입용)
    artStylePresets.ts            # 그림체 5종 프리셋 + 프롬프트
    studentService.ts             # 학습자 목록 Supabase 쿼리
```

## 진입점

- 사이드바 `"ai-template"` 탭 → `AiTemplateContent.tsx` → "AI 스토리북" 카드 클릭 → `StorybookWizardModal`

## 6단계 위자드 흐름

```
1. 아동 정보 → 2. 주제 입력 → [fetchProposals] → 3. 기획서 선택
→ 4. 스타일 설정 → [generateBook] → 5. 생성 중 → 6. 완료
```

- Step 2 → 3: `fetchProposals()` 비동기 호출 (현재 Mock 1초)
- Step 4 → 5 → 6: `generateBook()` 비동기 호출 (현재 Mock 3초)

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

## 현재 상태 (Mock)

- AI API 미연동 — `mockStoryService.ts`가 하드코딩된 기획서 2개와 스토리북 반환
- 이미지 생성 미구현 — `imageUrl: ""`
- DB 저장 미구현 — 스토어에만 존재
- 에디터 캔버스 삽입 미구현

## 주의사항

1. **structuredClone**: `selectProposal`에서 기획서 deep clone 시 사용
2. **crypto.randomUUID()**: 모든 ID 생성에 사용
3. **소프트 삭제 필터**: `studentService.ts`에서 `.is("deleted_at", null)` 필수
4. **소유권 필터**: `.eq("user_id", session.user.id)` 필수
5. **모달 닫기 방지**: 생성 중(`isLoading`) 닫기 버튼 비활성화
