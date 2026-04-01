# 특수교육용 이미지 소재 생성 (Image-Gen) 지침

> 치료사가 아동별 맞춤 이미지 소재를 AI 채팅으로 생성하는 기능. 아동별 Agent가 진단/감각 특성에 맞는 그림체를 자동 적용.

## 접근 제어

- `role === "tester" || role === "admin"` 만 접근 가능
- tester 유저 로그인 시 `/image-gen`으로 자동 리다이렉트 (`HomePage.tsx`)
- 헤더에 "이미지 생성" 버튼 표시 (`Header.tsx`) — admin은 "이미지 생성" + "관리자" 둘 다 표시

## 페이지 흐름

```
/image-gen (새 대화)
  → 아동 선택 → 프롬프트 입력 → 세션 생성
  → 질문 패널 (agent 성숙도에 따라 0~2개)
  → 이미지 생성 → 결과 표시 + 피드백

/image-gen/:sessionId (기존 대화)
  → 메시지 복원 → 후속 대화/재생성
```

## 세션 기반 대화

- 첫 메시지 시 세션 자동 생성 (`createSession`)
- 세션 생성 후 이미지 생성 완료까지 `/image-gen`에서 로딩 표시
- 생성 완료(또는 에러) 후 `/image-gen/:sessionId`로 navigate
- `sessionIdRef`로 생성 진행 중 useEffect 리셋 방지 (phase를 동기적으로 확인: `useImageGenStore.getState().phase`)

## 프롬프트 생성 모드

"프롬프트 생성해줘", "프롬프트 만들어줘" 등의 입력 감지 시:
- 이미지 생성 없이 `buildImagePrompt`로 프롬프트 텍스트만 반환
- assistant 메시지 `metadata.type: "prompt"` — 바이올렛 카드 UI + 복사 버튼
- 질문 단계/이미지 생성 스킵, 크레딧 미차감
- 감지 패턴: `PROMPT_REQUEST_PATTERN` (ImageGenPage.tsx 상단)

## AI 파이프라인

```
유저 입력
  → 프롬프트 요청 감지? → 프롬프트 텍스트 반환 (이미지 생성 스킵)
  → 질문 필요? → ClarifyPanel (agent 성숙도 기반 0~2개 질문)
  → buildImagePrompt (로컬, API 0회)
  → generateAndUpload (Gemini 이미지 생성 + Cloudinary 업로드)
  → 결과 메시지 저장
```

### Agent 성숙도 단계

| 단계 | 생성 횟수 | 질문 수 |
|------|-----------|---------|
| exploring | 0~5회 | 최대 2개 |
| transitioning | 5~15회 | 최대 1개 |
| confident | 15회+ (수정률 <20%) | 0개 |

### 프롬프트 빌더 (`promptBuilder.ts`)

Gemini 호출 0회. 로컬에서만 조립:
1. 유저 입력 (최우선, 그대로)
2. 참고 이미지 컨텍스트 힌트
3. 멀티컷/한국 문화 맥락
4. Agent 기본값 (스타일, 배경, 복잡도, 진단 보정)
5. 안전 규칙 (텍스트/폭력 금지, 인쇄용)

## 5-tier 시각 스타일

| 스타일 | 대상 | 설명 |
|--------|------|------|
| flat | 기본 | 굵은 테두리, 밝은 단색, 둥근 형태 |
| pastel | 감각과민 | 파스텔, 회색 테두리, 자극 최소 |
| realistic | 지적장애 중등도+ | 실물 사진 스타일 |
| high_contrast | ADHD | 고대비, 선명한 초점 |
| line_art | 선긋기/색칠용 | 흑백 선화 |

## 아동별 Agent 학습

- Thompson Sampling 기반 피드백 학습
- 좋아요 → `recordLike` → 현재 설정 강화
- 싫어요 → `recordDislike` → 수정 모드 진입
- 수정 후 좋아요 → `confirmRegenerationSuccess` → 패턴 영구 저장
- `LearnedPattern`: 원본 프롬프트 → 수정 내용 → 파라미터 변경 기록

## 이미지 다운로드

외부 URL(Cloudinary)은 `<a download>` 속성이 동작하지 않음. fetch → blob → `URL.createObjectURL` → 프로그래밍 방식 다운로드. 실패 시 `window.open` fallback.

## Supabase 테이블

| 테이블 | 용도 | 소유권 | 소프트 삭제 |
|--------|------|--------|------------|
| `new_image_gen_students` | 이미지 생성 전용 아동 | `user_id` | `deleted_at` |
| `new_image_gen_agents` | 아동별 시각 Agent | `user_id` | — |
| `new_image_gen_history` | 생성 이미지 이력 | `user_id` | — |
| `new_image_gen_learned_patterns` | 재생성 학습 패턴 | — | — |
| `new_image_gen_sessions` | 대화 세션 | `user_id` | `deleted_at` |
| `new_image_gen_messages` | 세션 메시지 | `user_id` | `deleted_at` |

## 관련 파일

| 역할 | 경로 |
|------|------|
| 메인 페이지 | `src/features/image-gen/pages/ImageGenPage.tsx` |
| 라우트 가드 | `src/pages/image-gen/ImageGenRoute.tsx` |
| 스토어 | `src/features/image-gen/store/useImageGenStore.ts` |
| 타입 | `src/features/image-gen/model/types.ts` |
| 프롬프트 빌더 | `src/features/image-gen/ai/promptBuilder.ts` |
| 이미지 생성 | `src/features/image-gen/ai/imageGenerator.ts` |
| 질문 생성 | `src/features/image-gen/ai/clarifyQuestions.ts` |
| Agent CRUD/학습 | `src/features/image-gen/ai/childAgent.ts` |
| 진단 프로필 | `src/features/image-gen/ai/diagnosisProfile.ts` |
| 세션 API | `src/features/image-gen/data/sessionApi.ts` |
| 이력 API | `src/features/image-gen/data/imageApi.ts` |
| 아동 선택기 | `src/features/image-gen/components/ChildSelector.tsx` |
| Agent 카드 | `src/features/image-gen/components/AgentCard.tsx` |
| 이미지 이력 | `src/features/image-gen/components/ImageHistory.tsx` |
| 질문 패널 | `src/features/image-gen/components/ClarifyPanel.tsx` |
| 아동 수정 모달 | `src/features/image-gen/components/ChildEditModal.tsx` |
