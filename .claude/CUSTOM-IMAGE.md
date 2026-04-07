# PRD: 스토리북 이미지 일관성 개선 + 커스텀 그림체/캐릭터 저장

**브랜치:** `이미지-일관성-개선`
**기준 브랜치:** `음절박스-추가` (main 기반)
**변경 파일:** 14개 (신규 2개, 수정 12개)
**코드 변경량:** +766줄, -118줄
**커밋:** 6개

---

## 1. 변경 사항 요약

### A. 스토리북 이미지 일관성 개선

**파일:** `storybook/ai/generateStoryImages.ts`

**문제:** 기존 앵커 체인 방식은 이전 생성 이미지를 다음 이미지의 레퍼런스로 넘기므로, 복사의 복사가 반복되어 캐릭터 외형이 점점 변형됨.

**변경:**

| 항목 | Before | After |
|------|--------|-------|
| 레퍼런스 이미지 | 1장 (이전 생성 이미지 OR 캐릭터 레퍼런스) | 2장 (캐릭터 레퍼런스 항상 고정 + sceneGroup별 장면 앵커) |
| 앵커 관리 | `currentAnchor` 변수, `MAX_ANCHOR_CHAIN=3`으로 강제 리셋 | `sceneGroupAnchors` Map — 같은 sceneGroup의 첫 생성 이미지를 고정 앵커로 사용 |
| 리셋 판단 | `shouldResetAnchor()` — 매 페이지마다 Gemini API 추가 호출 | sceneGroup 번호로 자동 판단 — 추가 API 호출 없음 |
| 프롬프트 | 단일 `CONSISTENCY_SUFFIX` | `CHARACTER_ONLY_SUFFIX` (sceneGroup 첫 페이지) + `DUAL_REF_SUFFIX` (후속 페이지) — 역할 분리 |

**제거된 코드:**
- `MAX_ANCHOR_CHAIN` 상수
- `shouldResetAnchor()` 함수 (Gemini 2.5-flash 텍스트 호출 — 페이지당 1회 절약)
- `chainLength`, `currentAnchor` 변수
- `CONSISTENCY_SUFFIX` 상수

**생성 흐름 예시 (10페이지, sceneGroup 1→1→1→2→2→3→3→3→4→4):**

```
Page 1 (group1): [캐릭터Ref]                    → result1, group1 앵커로 저장
Page 2 (group1): [캐릭터Ref] + [result1]        → result2
Page 3 (group1): [캐릭터Ref] + [result1]        → result3
Page 4 (group2): [캐릭터Ref]                    → result4, group2 앵커로 저장
Page 5 (group2): [캐릭터Ref] + [result4]        → result5
Page 6 (group3): [캐릭터Ref]                    → result6, group3 앵커로 저장
Page 7 (group3): [캐릭터Ref] + [result6]        → result7
Page 8 (group3): [캐릭터Ref] + [result6]        → result8
Page 9 (group4): [캐릭터Ref]                    → result9, group4 앵커로 저장
Page 10(group4): [캐릭터Ref] + [result9]        → result10
```

---

### B. 캐릭터 생성 프롬프트 개선

**파일:** `storybook/ai/generateCharacterReference.ts`

| 항목 | Before | After |
|------|--------|-------|
| 유저 입력 위치 | 프롬프트 맨 끝 `"Additional character details"` | 프롬프트 최상단 `"IMPORTANT — top priority"` |
| 배경 지시 | `"clean white background"` (약한 표현) | `"Pure solid white (#FFFFFF), no gradients, no shadows, no scenery"` (강제) |
| 프롬프트 구조 | `[기본틀] + [그림체] + [규칙] + "추가: {유저입력}"` | `[기본틀] + [유저입력 최우선] + [그림체] + [규칙] + [배경 강제]` |

---

### C. 커스텀 그림체 직접입력

**파일:** `storybook/components/steps/ArtStyleStep.tsx`, `storybookTypes.ts`, `storybookValidation.ts`

- `ArtStyleId` 타입에 `"custom"` 추가
- 기존 5종 프리셋 아래에 구분선 + "직접 입력" 옵션 추가
- "직접 입력" 선택 시 드롭다운 아래에 textarea 노출
- 입력한 텍스트가 `formData.customPromptTemplate`에 저장
- 이미지 생성 시 `ART_STYLE_PRESETS`의 `promptTemplate` 대신 `customPromptTemplate` 사용
- validation: `artStyle === "custom"`이면 `customPromptTemplate`이 비어있지 않은지 검증

---

### D. 캐릭터 저장/재사용

**파일:** `ArtStyleStep.tsx`, `ReferenceImageStep.tsx`, `useStorybookWizardStore.ts`, `savedCharacterApi.ts`

**저장 경로 2가지:**

1. **Step 4.5 "캐릭터 저장" 버튼** — AI 생성 또는 업로드한 캐릭터를 저장
2. **Step 4 "+" 업로드 버튼** — 파일 선택 → Cloudinary 업로드 + Supabase 저장 후 목록에 즉시 반영

**저장 흐름:**
```
base64 이미지 → Cloudinary (muru-saved-characters/{userId}/) 업로드
             → Supabase user_saved_characters 테이블에 메타데이터 insert
```

**저장 항목:** 이름(아동이름+"캐릭터"), 이미지 URL, 그림체 ID, 커스텀 프롬프트, 아동 정보 스냅샷

**재사용 (Step 4):**
- Step 4 최상단 "저장된 캐릭터" 영역 — 가로 스크롤 80x80px 사각형 나열
- 첫 번째에 "+" 업로드 버튼 항상 표시
- "배경이 흰색인 캐릭터 이미지를 업로드해 주세요" 안내 문구
- 컴포넌트 마운트 시 `fetchSavedCharacters(userId)` 호출하여 목록 로드
- 캐릭터 클릭 시:
  1. 해당 캐릭터의 `artStyleId`를 그림체로 설정 (없으면 `"custom"`)
  2. 해당 캐릭터의 `promptTemplate`을 커스텀 프롬프트로 설정
  3. Cloudinary URL에서 이미지를 fetch → base64 변환 → `referenceImageBase64`로 설정
- "다음" 클릭 시 Step 4.5를 스킵하고 바로 Step 5(생성)로 이동, `generateBook()` 자동 호출

**삭제:** 캐릭터 카드 hover 시 X 버튼 → 소프트 삭제 (`deleted_at` 설정)

---

## 2. 배포 전 필수 작업

### Supabase 테이블 생성 (SQL Editor에서 실행)

```sql
-- 저장된 캐릭터
create table user_saved_characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  name text not null default '캐릭터',
  image_url text not null,
  art_style_id text,
  prompt_template text,
  child_info_snapshot jsonb,
  created_at timestamptz default now(),
  deleted_at timestamptz
);

alter table user_saved_characters enable row level security;

create policy "Users can manage own characters"
  on user_saved_characters
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 커스텀 그림체 (현재 CRUD 함수 준비되어 있으나 UI에서 미사용 — 향후 확장용)
create table user_custom_art_styles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  style_name text not null,
  prompt_template text not null,
  preview_image_url text,
  created_at timestamptz default now(),
  deleted_at timestamptz
);

alter table user_custom_art_styles enable row level security;

create policy "Users can manage own art styles"
  on user_custom_art_styles
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

### Cloudinary

- 기존 upload preset에 `muru-saved-characters` 폴더 접근 허용 확인
- `VITE_CLAUDINARY_UPLOAD_PRESET` 환경변수 필수

---

## 3. 변경된 파일 목록

### 신규 파일

| 파일 | 용도 |
|------|------|
| `storybook/api/savedCharacterApi.ts` | 캐릭터 Cloudinary 업로드 + Supabase CRUD (`fetchSavedCharacters`, `saveCharacter`, `deleteCharacter`) |
| `storybook/api/customArtStyleApi.ts` | 커스텀 그림체 Supabase CRUD — 향후 확장용 |

### 수정 파일 — 스토리북

| 파일 | 변경 내용 |
|------|----------|
| `storybook/ai/generateStoryImages.ts` | 듀얼 레퍼런스 구조 전면 리팩토링 — `shouldResetAnchor` 제거, sceneGroup 기반 앵커, `customPromptTemplate` 파라미터 추가 |
| `storybook/ai/generateCharacterReference.ts` | 유저 입력을 프롬프트 최상단 배치, 배경 `#FFFFFF` 강제, `buildCharacterPrompt`에 `customPrompt` 파라미터 통합 |
| `storybook/ai/generateStorybook.ts` | `customPromptTemplate` 파라미터 추가하여 `generateStoryImages`에 전달 |
| `storybook/model/storybookTypes.ts` | `ArtStyleId`에 `"custom"` 추가, `SavedCharacter` 인터페이스, `WizardFormData`에 `customPromptTemplate`·`selectedCharacterId` 필드 |
| `storybook/model/storybookValidation.ts` | `validateArtStyle`에 커스텀 프롬프트 검증 추가 |
| `storybook/store/useStorybookWizardStore.ts` | `setCustomPromptTemplate`, `selectSavedCharacter`, `clearSavedCharacter` 액션, `goNext`에서 Step 4.5 스킵 로직, `generateCharacterRef`/`generateBook`에 커스텀 프롬프트 처리 |
| `storybook/components/steps/ArtStyleStep.tsx` | 저장된 캐릭터 가로 스크롤 영역 + "+" 업로드 버튼 + 안내 문구, 그림체 드롭다운에 "직접 입력" 옵션+textarea |
| `storybook/components/steps/ReferenceImageStep.tsx` | "캐릭터 저장" 버튼 + 저장 성공 상태 표시 |

### 수정 파일 — 음절상자 (별도 기능, 같은 브랜치)

| 파일 | 변경 내용 |
|------|----------|
| `editor/store/elementStore.ts` | `requestSyllableBox` 액션 |
| `editor/utils/pageFactory.ts` | `addSyllableBoxElement` 팩토리 함수 (3개 rect 그룹) |
| `editor/hooks/useElementSubscription.ts` | 음절상자 구독 연결, 반환 타입 `string \| string[]` 처리 |
| `editor/sections/sidebar/content/ElementContent.tsx` | 도형&선 그리드에 음절상자 버튼 + SVG 아이콘 |

---

## 4. 커밋 내역

| 커밋 | 내용 |
|------|------|
| `61f4c45` | feat(editor): 음절상자 원클릭 삽입 기능 추가 |
| `ac9674a` | fix(editor): 음절상자 버튼을 도형&선 섹션으로 이동 및 크기 40% 축소 |
| `ef09857` | refactor(storybook): 듀얼 레퍼런스 기반 이미지 일관성 개선 |
| `2888ac4` | feat(storybook): 커스텀 그림체 직접입력 + 캐릭터 저장/재사용 기능 |
| `b3d5549` | feat(storybook): Step 4에 캐릭터 업로드 버튼 추가 |
| `14fbff7` | fix(storybook): 캐릭터 생성 프롬프트 개선 — 유저 입력 최우선 + 배경 #FFFFFF 강제 |

---

## 5. 테스트 체크리스트

### 이미지 일관성
- [ ] 스토리북 생성 후 10페이지의 캐릭터 외형이 일관되는지 확인
- [ ] 같은 sceneGroup 내 페이지들의 배경/분위기가 유사한지 확인
- [ ] sceneGroup이 바뀌는 페이지에서 배경이 자연스럽게 전환되는지 확인
- [ ] 캐릭터 레퍼런스 없이 생성해도 에러 없이 동작하는지 확인

### 캐릭터 생성 프롬프트
- [ ] Step 4.5에서 커스텀 프롬프트 입력 후 생성 → 유저 입력 특징이 반영되는지 확인 (예: "안경 쓴" → 안경 있는 캐릭터)
- [ ] 생성된 캐릭터 배경이 흰색(#FFFFFF)인지 확인
- [ ] 커스텀 프롬프트 없이 생성해도 정상 동작 확인

### 커스텀 그림체
- [ ] Step 4에서 "직접 입력" 선택 → textarea 노출 확인
- [ ] 프롬프트 미입력 상태에서 다음 버튼 비활성화 확인
- [ ] 커스텀 프롬프트로 스토리북 생성 시 해당 그림체 반영 확인
- [ ] 기존 프리셋 선택 시 동작 변화 없음 확인

### 캐릭터 저장/재사용
- [ ] Step 4 "+" 업로드 버튼 → 파일 선택 → 목록에 즉시 추가 확인
- [ ] "배경이 흰색인 캐릭터 이미지를 업로드해 주세요" 안내 문구 표시 확인
- [ ] Step 4.5 "캐릭터 저장" 버튼 → "저장 완료" 표시 확인
- [ ] Step 4 재진입 시 저장된 캐릭터 목록 표시 확인
- [ ] 저장된 캐릭터 선택 → 다음 클릭 → Step 4.5 스킵하고 바로 생성 시작 확인
- [ ] 저장된 캐릭터 삭제 (hover → X 버튼) → 목록에서 제거 확인
- [ ] 저장된 캐릭터 재선택(토글 해제) 시 정상 동작 확인

### 음절상자
- [ ] 사이드바 > 요소 > 도형&선 그리드에 음절상자 버튼 표시 확인
- [ ] 클릭 시 캔버스에 3개 rect(초록/분홍/노랑) 그룹 삽입 확인
- [ ] 그룹 이동/리사이즈 동작 확인

---

## 6. 주의사항

1. **Supabase 테이블 미생성 시** 캐릭터 저장/로드가 실패하지만, `try-catch`로 감싸져 있어 앱 크래시는 발생하지 않음. 저장된 캐릭터 영역에 업로드 버튼만 표시됨.
2. **`VITE_CLAUDINARY_UPLOAD_PRESET` 미설정 시** 캐릭터 업로드/저장 시 Cloudinary 업로드 실패. 기존 스토리북 이미지 업로드와 동일한 preset 사용.
3. **sceneGroup 의존성**: 이미지 일관성 개선은 `generateStorybook.ts`에서 AI가 할당하는 `sceneGroup` 번호에 의존. AI가 전부 같은 그룹으로 할당하면 페이지1의 장면 앵커에 모든 후속 페이지가 묶임. 반대로 전부 다른 그룹이면 장면 앵커 없이 캐릭터 레퍼런스만 사용됨. 두 경우 모두 기존보다 나쁘지 않음 (캐릭터 레퍼런스가 항상 고정되므로).
4. **API 비용 절감**: `shouldResetAnchor()` 제거로 페이지당 Gemini 2.5-flash 텍스트 호출 1회 절약 (10페이지 기준 약 9회).
5. **캐릭터 업로드 안내**: 유저에게 "배경이 흰색인 캐릭터 이미지"를 업로드하도록 안내 문구 포함. 배경이 있는 이미지를 업로드하면 Gemini가 배경까지 레퍼런스로 인식할 수 있음.
