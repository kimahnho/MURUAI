# AI 치료 활동 (Studio) 지침

> 치료사가 AI 채팅으로 발달장애 아동 맞춤 학습지를 생성하고, 세션을 기록/평가하는 기능.

## 접근 제어

- `role === "tester" || role === "admin"` 만 접근 가능
- tester 유저 로그인 시 `/studio`로 자동 리다이렉트 (`HomePage.tsx`)
- 헤더에 "스튜디오" 버튼 표시 (`Header.tsx`)
- 에디터 사이드바 치료 탭: `roleOnly: ["tester", "admin"]` 조건부 표시

## 3단계 페이지 흐름

```
/studio (채팅 페이지)
  → AI 채팅으로 학습지 세트 생성 (5장)
  → "학습지 확인하기" 클릭

/studio/workspace (학습지 작업 페이지)
  → 카드 그리드로 시각적 확인/수정
  → 완성 후 "캔버스로 열기" → Page[] 전달

/:docId/edit (캔버스 에디터)
  → 완성된 데이터만 수신
  → 기존 에디터 기능 (인쇄, PDF, 수정 등)
```

## 10단계 AI 파이프라인

```
입력 → 안전검사(safetyCheck) → 도메인감지(domainDetection)
→ 익명화(anonymizeForLLM) → 의도분류(intentDetection)
→ 서버 API 호출(/api/genai/studio) → 응답 파싱
→ 가드레일(guardrails) → 결과 반환
```

- 안전검사 + 가드레일은 클라이언트와 서버 양쪽에서 실행
- 시스템 프롬프트 조립은 서버에서만 (도메인 레퍼런스 주입)

## 6개 도메인

| 도메인 | 키워드 예시 |
|--------|-------------|
| emotion | 감정, 표정, 감정추론, 감정인식 |
| language | 조음, 발음, 어휘, 문장, 언어 |
| cognition | 인지, 분류, 변별, 패턴, 순서 |
| motor | 선긋기, 소근육, 따라그리기, 쓰기 |
| social | 사회성, 친구, 차례, 규칙, 인사 |
| play | 놀이, 블록, 역할놀이, 상상놀이 |

## 가드레일 (30+ 규칙)

| 액션 | 동작 |
|------|------|
| warn | 경고 메시지 표시, 진행 허용 |
| override | 결과 자동 수정 (예: ASD L3 → 항목 2개 + easy) |
| block | 생성 중단 + 전문가 연계 메시지 (CAS, 유창성, 음성장애 등) |

## 프라이버시

- `anonymizeForLLM()` 필수 — 이름, 생년월일, 전화번호, 이메일 제거
- Google이 보는 정보: 나이, 진단 코드, 도메인, 난이도, 주제
- Google이 보지 않는 정보: 아동 이름, 센터명, 치료사명, 연락처

## Supabase 테이블

| 테이블 | 용도 | 소프트 삭제 |
|--------|------|------------|
| `therapy_sessions` | 세션 기록 | `deleted_at` ✅ |
| `therapy_worksheets` | 생성된 학습지 | `deleted_at` ✅ |
| `therapy_chat_logs` | 채팅 메시지 | `deleted_at` ✅ |
| `therapy_student_profiles` | 치료 전용 아동 프로필 | `deleted_at` ✅ |
| `therapy_evaluations` | 세션 평가 | `deleted_at` ✅ |

## Mixpanel 이벤트

| 이벤트 | 시점 | 속성 |
|--------|------|------|
| `치료 학습지 생성` | 세션 세트 생성 완료 | `domain`, `sheet_count` |
| `치료 세션 시작` | 세션 녹화 시작 | `domain` |
| `치료 세션 평가 저장` | 평가 저장 완료 | `duration_seconds` |
| `치료 학습지 캔버스 열기` | workspace → 에디터 이동 | `domain`, `sheet_count` |

## 관련 파일

| 역할 | 경로 |
|------|------|
| 채팅 페이지 | `src/features/studio/pages/TherapyPage.tsx` |
| 작업 페이지 | `src/features/studio/pages/WorkspacePage.tsx` |
| 채팅 패널 | `src/features/studio/components/TherapyChatPanel.tsx` |
| 메시지 버블 | `src/features/studio/components/TherapyChatMessage.tsx` |
| 세션 사이드바 | `src/features/studio/components/SessionSidebar.tsx` |
| 세션 레코더 | `src/features/studio/components/SessionRecorder.tsx` |
| 파이프라인 | `src/features/studio/ai/therapyPipeline.ts` |
| 안전검사 | `src/features/studio/ai/safetyCheck.ts` |
| 도메인감지 | `src/features/studio/ai/domainDetection.ts` |
| 익명화 | `src/features/studio/ai/anonymizeForLLM.ts` |
| 가드레일 | `src/features/studio/ai/guardrails.ts` |
| 의도분류 | `src/features/studio/ai/intentDetection.ts` |
| 오버레이 | `src/features/studio/ai/agentOverlay.ts` |
| Living Agent | `src/features/studio/ai/livingAgent.ts` |
| 서비스 | `src/features/studio/data/therapyService.ts` |
| 세션 서비스 | `src/features/studio/data/sessionService.ts` |
| 스토어 | `src/features/studio/store/useTherapyStore.ts` |
| 워크시트 변환 | `src/features/studio/utils/buildTherapyWorksheetPages.ts` |
| 타입 | `src/features/studio/model/therapyTypes.ts` |
| 상수 | `src/features/studio/model/therapyConstants.ts` |
| 서버 프록시 | `api/genai/studio.ts` |
| 서버 프롬프트 | `api/_lib/studio/buildPrompt.ts` |
| 도메인 레퍼런스 | `api/_lib/studio/refs/*.md` (서버 전용) |
| 라우트 가드 | `src/pages/studio/StudioRoute.tsx` |
| workspace 가드 | `src/pages/studio/WorkspaceRoute.tsx` |
| 에디터 치료 탭 | `src/features/editor/sections/sidebar/content/TherapyContextContent.tsx` |
