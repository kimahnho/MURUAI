# AI 이미지 생성 임시 중단 상태 — 복원 가이드

> Vertex AI 전환 중 이미지 생성 기능이 임시 중단됨. AI 모델 설정이 완료되면 아래 파일들의 주석을 해제하여 원상복구.

## 현재 상태

- **텍스트 생성**: 정상 동작 (Vertex AI API Key 인증, `src/shared/api/genai.ts`)
- **이미지 생성**: 중단 (감정추론 히어로 이미지, 스토리북 캐릭터/삽화)
- **AI 이미지 생성 탭**: 정상 동작 (`useAiImageGeneration.ts`)

## 검색 키워드

모든 임시 중단 주석에 `이미지 생성 임시 중단` 키워드가 포함됨.

```bash
grep -r "이미지 생성 임시 중단" src/
```

## 복원 시 수정할 파일

### 1. 스토리북

| 파일 | 복원 작업 |
|------|-----------|
| `src/features/storybook/ai/generateStorybook.ts` | `generateStoryImages` import 주석 해제 + 이미지 생성 호출 주석 해제 + `_referenceImageBase64`/`_onImageProgress` 파라미터에서 `_` 접두사 제거 |
| `src/features/storybook/store/useStorybookWizardStore.ts` | `STEP_ORDER`에 `45` 복원: `[1, 2, 3, 4, 45, 5, 6]` + 에러 fallback `currentStep: 45` 복원 + `generateBook`에서 artStyle 기본값 로직 제거, `formData.artStyle` 직접 사용 복원 |
| `src/features/storybook/components/StorybookWizard.tsx` | `ReferenceImageStep` import 복원 + `STEP_COMPONENTS[45]` 복원 + `INTERACTIVE_STEPS`/`INDICATOR_STEPS`에 `45` 복원 + `handleNext`에서 `currentStep === 45` 분기 복원 + `nextLabel` 복원 + 스텝 번호 매핑 복원 |
| `src/features/storybook/components/steps/ArtStyleStep.tsx` | 그림체 드롭다운 `<Section>` 주석 해제 + 안내 박스 제거 + `artStyle`/`setArtStyle`/`isStyleOpen`/`selectedPreset`/`StyleOption`/`ART_STYLE_PRESETS`/`ArtStylePreset` import 주석 해제 |
| `src/features/storybook/model/storybookValidation.ts` | `case 4`에서 `validateArtStyle` 복원 |
| `src/features/storybook/utils/buildStoryPages.ts` | 플레이스홀더 박스 else 분기 제거 (선택 — 이미지가 정상 생성되면 불필요하지만 남겨둬도 무방) |

### 2. 감정추론

| 파일 | 복원 작업 |
|------|-----------|
| `src/features/editor/sections/sidebar/content/AiTemplateContent.tsx` | `useEmotionSceneStore` import 주석 해제 + `addPendingGeneration` 호출 주석 해제 + 토스트 메시지를 "텍스트가 생성되었어요. 내용을 확인 후 이미지를 생성하세요."로 복원 |
