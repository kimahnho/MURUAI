# AI 생성 로그 추적 지침

> `ai_generation_logs` 테이블 기반 4단계 추적 패턴.

## 테이블: `ai_generation_logs`

| 컬럼 | 타입 | 용도 | 기록 시점 |
|------|------|------|-----------|
| `id` | UUID (PK) | 로그 ID | Step 1 |
| `user_id` | UUID (FK) | 사용자 | Step 1 |
| `type` | TEXT | 템플릿 타입 ("emotion" / "storybook") | Step 1 |
| `topic` | TEXT | 입력 주제 | Step 1 |
| `source` | TEXT | 진입점 ("landing" / "editor") | Step 1 |
| `stories` | JSONB | AI 1차 결과 (StoryItem[]) | Step 2 |
| `initial_texts` | JSONB | 1차 텍스트 [{title, sentence}] | Step 2 |
| `user_made_id` | UUID (FK) | 생성된 문서 ID | Step 2 |
| `image_style` | TEXT | 장면 이미지 성별 ("photo-boy"/"photo-girl") | Step 3, 4 |
| `card_style` | TEXT | 감정 카드 성별 | Step 4 |
| `final_texts` | JSONB | 최종 텍스트 [{title, sentence}] | Step 4 |
| `final_image_urls` | JSONB | 최종 히어로 이미지 URL[] | Step 4 |
| `confirmed_at` | TIMESTAMPTZ | 확정 시점 | Step 4 |
| `created_at` | TIMESTAMPTZ | 생성 시점 | 자동 |

## 추적 함수 (`src/shared/utils/trackAiGeneration.ts`)

모든 함수는 **비차단** — 실패해도 사용자 흐름을 막지 않는다 (`console.warn`).

| 함수 | 단계 | 호출 위치 |
|------|------|-----------|
| `createAiGenerationLog(userId, type, topic, source)` | Step 1: 주제 입력 | `useEditorSubscriptions` |
| `updateAiGenerationStories(logId, stories, initialTexts, userMadeId)` | Step 2: AI 결과 | `useEditorSubscriptions` |
| `updateAiGenerationImageStyle(logId, imageStyle)` | Step 3: 이미지 생성 클릭 | `EmotionSceneBanner` |
| `confirmAiGeneration(logId, finalTexts, finalImageUrls, cardStyle, imageStyle)` | Step 4: 확정 | `EmotionSceneBanner` |

## 데이터 전달 패턴

### 랜딩 → 에디터

```
HomePage.executeGeneration()
  → sessionStorage("pendingAiLog") 저장 (topic, stories, initialTexts, storyPageIds, source)
    → 에디터 이동
      → useEditorSubscriptions의 useEffect가 소비
        → pages 로드 대기 (storyPageIds가 pages에 존재할 때만 실행)
        → createAiGenerationLog() + updateAiGenerationStories()
        → sessionStorage("aiGenerationLogId") 저장
          → EmotionSceneBanner에서 읽어 사용
```

### logId 전달

`sessionStorage("aiGenerationLogId")`로 배너에서 읽음:
- "이미지 생성" 클릭 → `updateAiGenerationImageStyle(logId, imageStyle)`
- "확정하기" 클릭 → `confirmAiGeneration(logId, finalTexts, finalImageUrls, cardStyle, imageStyle)`

## RLS

```sql
-- 본인 데이터만 INSERT/UPDATE/SELECT
CREATE POLICY "Users can insert own logs" ON ai_generation_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own logs" ON ai_generation_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can select own logs" ON ai_generation_logs FOR SELECT USING (auth.uid() = user_id);
```

## 관련 파일

| 역할 | 경로 |
|------|------|
| 추적 함수 | `src/shared/utils/trackAiGeneration.ts` |
| 랜딩 생성 | `src/pages/home/HomePage.tsx` |
| 에디터 소비 | `src/features/editor/hooks/useEditorSubscriptions.ts` |
| 배너 기록 | `src/features/editor/sections/canvas/EmotionSceneBanner.tsx` |
