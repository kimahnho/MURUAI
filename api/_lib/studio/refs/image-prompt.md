---
name: asd-worksheet-prompt
description: |
  Generates AI image generation prompts optimized for educational worksheets
  targeting children with ASD, intellectual disabilities, language delays,
  and other developmental disabilities. Covers object recognition, emotion
  inference, matching, spot-the-difference, classification, line-connecting,
  sequencing, and more. Supports batch generation for multiple children.
  Use when the user asks to create worksheet images, learning material
  illustrations, therapy resource images, or any visual content for
  special education / developmental therapy worksheets. Also trigger
  when the user mentions 학습지, 치료 자료, 감정추론, 사물인지,
  틀린그림찾기, 짝맞추기, 카테고리분류, 순서맞추기, or similar
  Korean therapy education terms.
argument-hint: [worksheet-type or description]
---

# ASD Worksheet Image Prompt Generator

Generate precise, optimized image prompts for AI image generators (Gemini, DALL-E, Midjourney, etc.) that produce illustrations suitable for educational worksheets for children with developmental disabilities.

## Step 0: Parse Input & Normalize

Before generating any prompt, extract and normalize these parameters from the user's request. Many therapists use informal shorthand — handle it gracefully.

### Diagnosis Normalization

| User Input | Normalized To | Notes |
|------------|--------------|-------|
| 자폐1급, 자폐 1급 | ASD Level 3 (high support) | 구 장애등급 (2019년 폐지). 1급=최중증 |
| 자폐2급, 자폐 2급 | ASD Level 2 (moderate support) | |
| 자폐3급, 자폐 3급 | ASD Level 1 (low support) | |
| 고기능 자폐, 고기능 ASD | ASD Level 1 | |
| 무발화, 비구어 | ASD Level 3 + nonverbal flag | 3-4 items max, icon-heavy |
| 지적장애 경도 | ID Mild (functional age = chronological - 2~3yr) | |
| 지적장애 중등도 | ID Moderate (functional age = chronological ÷ 2) | |
| 언어발달지연, 언어지연 | Language Delay (NOT ASD) | Text labels allowed |
| ASD + 지적장애 동반 | ASD + ID comorbid | Use lower of ASD/ID difficulty |
| ASD + ADHD | ASD + ADHD comorbid | Reduce visual distraction, increase scanning demands |
| 감각과민 | Sensory sensitivity flag | Trigger low-stimulation style |

### Functional Age Calculation

**This is critical.** Never use chronological age alone when cognitive delay is indicated.

| Diagnosis | Functional Age Rule |
|-----------|-------------------|
| ASD Level 1 only | Use chronological age |
| ASD Level 2 only | Chronological age - 1~2 years |
| ASD Level 3 / nonverbal | Chronological age - 2~3 years |
| ID Mild | Chronological age - 2~3 years |
| ID Moderate | Chronological age ÷ 2 (approx) |
| ASD + ID comorbid | Use ID rule (lower) |
| Language Delay only | Use chronological age for visual, -1yr for language tasks |

**Example:** "지적장애 중등도 11세" → functional age ~5-6세 → use Ages 5-6 parameters.

### Smart Defaults (When Input Is Sparse)

When the user gives minimal info (e.g., "자폐2급 5살 짝맞추기"), infer missing parameters:

| Missing Parameter | Default Rule |
|------------------|-------------|
| Theme not specified | Age 3-4: 동물/탈것 · Age 5-6: 일상사물/음식 · Age 7-9: 학교/사회상황 |
| Difficulty not specified | ASD L1→Medium · ASD L2→Easy-Medium · ASD L3→Easy |
| Item count not specified | Use Difficulty table below (cross-referenced with functional age) |
| Style not specified | Default: Flat illustration. Override if therapist requests otherwise |

**After inferring, echo assumptions** at the top of your response:
> "다음 조건으로 생성합니다: ASD Level 2 / 기능연령 5세 / 쉬운 난이도 / 일상사물 테마 / 짝 3쌍 / 일러스트 스타일"

### Therapy Goal → Worksheet Mapping

When a therapist mentions a therapy goal instead of a worksheet type:

| Therapy Goal | Recommended Worksheet | Adjustments |
|-------------|----------------------|-------------|
| 감정 읽기, 감정 인식 | 감정추론 | Start with basic emotions (행복, 슬픔, 화남) |
| 감정어휘 부족 | 감정추론 | Select specific target emotions, basic before complex |
| 집중력 훈련 | 틀린그림찾기 | Subtle differences, systematic scanning layout |
| 사회성, 또래 관계 | 순서맞추기 (social scenario) | Peer interaction scenes, explicit social cues |
| 사물인지, 명명하기 | 같은것찾기 or 짝맞추기 | Concrete daily objects |
| 분류, 범주화 | 카테고리분류 | Clear category boundaries |
| 소근육, 시각-운동 | 선연결하기 | Generous spacing, thick guide dots |

## Art Style System

### Style A: Flat Illustration (Default)

The standard style for most worksheets.

```
Clean, flat Korean children's educational illustration style.
Thick black outlines (2-3px), solid bright colors, minimal shading.
[Background: white / light solid color / simple scene].
Friendly rounded shapes, age-appropriate for [functional age] year olds.
No text embedded in the image.
Print-ready, clear at A4 size.
```

### Style B: Low-Stimulation (for 감각과민 children)

Use when sensory sensitivity is indicated. Reduces visual intensity.

```
Gentle, soft Korean children's educational illustration style.
Medium gray outlines (not black), muted pastel colors, no shading.
White background only. Rounded shapes, minimal detail.
Soft color palette: light blue, soft green, pale yellow, lavender.
No high-contrast elements, no red/orange, no busy patterns.
Age-appropriate for [functional age] year olds.
No text embedded in the image.
Print-ready, clear at A4 size.
```

### Style C: Photorealistic (when therapist requests 실물사진)

Use only when explicitly requested. Better for generalization to real objects (common in ID therapy).

```
Clean, well-lit product photography style on pure white background.
Each object photographed individually, centered, no overlapping.
Soft even lighting, no harsh shadows. Simple, recognizable everyday items.
Korean context: Korean brands, Korean food items, Korean clothing.
High resolution, suitable for A4 printing.
No text, no watermarks, no artistic filters.
```

### Style Selection Logic

1. Therapist says "파스텔", "자극 적게", "감각과민" → **Style B**
2. Therapist says "실물사진", "사진 스타일", "포토" → **Style C**
3. Otherwise → **Style A** (default)

## Text Label Policy

**Default: No text in images.** But override for language therapy contexts:

| Context | Text Policy |
|---------|------------|
| 언어치료 + 사물 매칭 | Allow Korean word labels below each object |
| 언어발달지연 + 짝맞추기 | Allow word-image pairing labels |
| AAC 관련 활동 | Allow simple text labels |
| All other contexts | No text in images |

When text labels are allowed, add to prompt:
```
Each object has a simple Korean label below it in clean sans-serif font
(e.g., "사과", "강아지"). Text is large, clear, and separate from the
illustration. Font: rounded, child-friendly hangul.
```

## Difficulty Level Adjustments

Cross-reference functional age AND ASD level:

| Parameter | Easy | Medium | Hard |
|-----------|------|--------|------|
| Object count | 3-4 | 5-6 | 7-10 |
| Visual similarity | Very different | Somewhat similar | Very similar |
| Background | White only | Light solid | Simple scene |
| Color palette | 3 colors | 4-5 colors | 5-7 colors |
| Scene complexity | Single objects | Objects in context | Full scenes |
| Differences (spot) | Obvious (color, presence) | Moderate (size, position) | Subtle (detail, pattern) |
| Pair complexity | Direct (lid↔pot) | Functional (brush↔paste) | Contextual (umbrella↔raincoat) |

**ASD Level modifier on top of age-based difficulty:**
- ASD L1: Use age-appropriate difficulty
- ASD L2: Reduce one step (if age says Medium, use Easy)
- ASD L3: Always Easy, max 3-4 items
- ADHD comorbid: Increase subtle details for attention training, but reduce background noise

## Critical Rule: One Activity Per Prompt

**Always generate exactly ONE activity type per prompt.** Each prompt produces one standalone worksheet activity.

**Exception — Batch & Set requests:** When a therapist requests multiple worksheets (e.g., "3장 세트", "일괄 생성"), output MULTIPLE separate prompts, clearly numbered. See "Batch & Set Generation" section below.

## Worksheet Types and Prompt Patterns

### 1. 같은 것 찾기 (Find the Same) — 완성형 학습지

```
[Art style block]

A COMPLETE A4 worksheet page, portrait orientation:

=== TOP (15%) ===
Title: "같은 것을 찾아보세요!" in large friendly Korean font.
Instruction: "위의 그림과 똑같은 것에 동그라미 하세요"

=== REFERENCE ROW (20%) ===
1 reference [object] in a highlighted box (light yellow background, dashed border).
Large, clear, centered. Label: "이것과 같은 것은?"

=== CANDIDATES (50%) ===
[N] candidate objects arranged in a [2×2 or 1×N] grid.
Each in its own rounded square cell with light gray border.
[M] objects identical to reference, rest are clearly different.
[Specific object descriptions for each].
Each cell is same size, evenly spaced.

=== BOTTOM (15%) ===
Empty dotted-line box for child's name and date.
[Text label line — if language therapy context]

White background. All within A4 proportions. Print-ready.
```

### 2. 짝 맞추기 (Match Pairs) — 완성형 학습지

```
[Art style block]

A COMPLETE A4 worksheet page, portrait orientation:

=== TOP (15%) ===
Title: "짝을 맞춰 보세요!" in large Korean font.
Instruction: "왼쪽 그림과 어울리는 것을 오른쪽에서 찾아 선으로 연결하세요"

=== MAIN AREA (70%) ===
Two columns of [N] objects each.
Left column: [list objects with descriptions] — each in a rounded box.
Right column: [list matching pair objects, shuffled order] — each in a rounded box.
Objects vertically aligned with equal spacing.
Wide horizontal gap between columns (5cm+) with faint dotted guide lines.
Each object standalone on white background.
No connecting lines drawn (child draws these).

=== BOTTOM (15%) ===
Name/date field. [Text label line — if language therapy context]

White background. All within A4 proportions. Print-ready.
```

**Pair difficulty levels (use based on functional age):**
- Direct: lid↔pot, sock↔shoe (ages 3-4)
- Functional: toothbrush↔toothpaste, key↔lock (ages 5-6)
- Contextual: umbrella↔raincoat, pencil↔notebook (ages 7+)

### 3. 틀린 그림 찾기 (Spot the Difference)

```
[Art style block]
Two side-by-side illustrations of the same scene: [scene description].
The scene contains: [list key elements].
Image A (left) and Image B (right) are identical EXCEPT for [N] differences:
  1. [Specific difference]
  2. [Specific difference]
  ...
Both scenes use identical composition for all non-different elements.
Simple scene with max [8-10] elements.
```

**Technical note:** AI generators struggle with two near-identical images. For best results:
1. Generate Image A first as a single complete scene
2. Then describe Image B as "identical to Image A except..." with specific edits
3. Or use inpainting workflows: generate one image, then edit specific areas

**ADHD comorbid adjustment:** Place differences strategically across all quadrants (not clustered). Force systematic visual scanning.

### 4. 카테고리 분류 (Category Classification) — 완성형 학습지

```
[Art style block]

A COMPLETE A4 worksheet page, portrait orientation:

=== TOP (15%) ===
Title: "알맞은 곳에 넣어 보세요!" in large Korean font.
Instruction: "그림을 보고 맞는 바구니에 선으로 연결하세요"

=== MIDDLE (55%) — 분류할 객체들 ===
[N] individual object illustrations in a 2-row grid.
Each object in a rounded square cell, clearly recognizable.
[list each object with description].

=== BOTTOM (30%) — 분류 바구니 ===
[M] category containers (baskets/boxes) in a row.
Each basket has:
  - An icon on top representing the category
  - Category name in Korean below icon
  - Basket is open/empty (for visual "put items here" cue)
  - [Category 1: icon + name]
  - [Category 2: icon + name]
Faint dotted lines from objects area to baskets area.

White background. All within A4 proportions. Print-ready.
```

### 5. 감정 추론 (Emotion Inference) — 완성형 학습지

**핵심: "장면 이미지"가 아니라 "학습지 전체"를 하나의 A4 이미지로 생성.**

```
[Art style block]

A COMPLETE A4 worksheet page, portrait orientation, with clear layout sections:

=== TOP SECTION (15%) ===
Title area with large friendly Korean text: "[활동 제목]"
(예: "이 친구는 어떤 기분일까요?")
Subtitle: simple instruction in Korean

=== MIDDLE SECTION (55%) — 상황 장면 ===
A scene showing [child character description] in [situation].
The character's expression clearly shows [target emotion]:
  - [Facial feature 1 — e.g., big smile, curved eyes]
  - [Facial feature 2 — e.g., arms raised]
  - [Body language detail]
Scene context reinforces the emotion:
  [Environmental cue — e.g., birthday cake, broken toy]
Scene is contained in a rounded rectangle with light border.
Simple background, character centered at ~50% of scene area.

=== BOTTOM SECTION (30%) — 감정 선택지 ===
[N] emotion choice cards arranged in a horizontal row:
Each card is a rounded square containing:
  - A face showing one emotion (same character style, face only)
  - Below the face: emotion name in Korean (행복/슬픔/화남/놀람)
  - Card border color matches emotion: yellow=행복, blue=슬픔, red=화남, orange=놀람
Cards are evenly spaced with clear separation.
One card matches the scene emotion (correct answer).

=== LAYOUT RULES ===
- White background for the entire page
- Clear visual hierarchy: title → scene → choices
- All elements contained within A4 proportions (210×297mm ratio)
- Generous padding between sections
- Print-ready at actual A4 size
```

**같은것찾기 / 짝맞추기 / 분류 등 다른 유형도 동일 원칙:**
모든 학습지 유형은 "완성형 A4 학습지"로 생성. 장면만이 아니라 제목+지시문+활동영역+선택지가 한 장에 포함.

**Emotion difficulty progression:**
- Basic (start here): 행복, 슬픔, 화남 (선택지 3개)
- Intermediate: 놀람, 두려움, 부끄러움 (선택지 4개)
- Advanced: 질투, 당혹, 걱정, 외로움 (선택지 5개)

### 6. 선 연결하기 (Line Connecting)

```
[Art style block]
Two columns of objects.
Left side: [list objects with attributes].
Right side: [list matching objects].
Objects clearly distinguishable by [matching attribute].
Generous spacing for line-drawing.
White background, no connecting lines.
```

### 7. 순서 맞추기 (Sequencing)

```
[Art style block]
[N] separate scene illustrations showing a sequence:
  1. [Step 1 description]
  2. [Step 2 description]
  ...
Each scene uses the SAME character: [character anchor description].
Scenes as individual cards with light rounded borders.
Clear visual progression. White background per card.
```

**Character Anchor** (for multi-image consistency):
```
Character anchor (use in ALL images of this set):
  A Korean [boy/girl], approximately [age] years old,
  [hair description], wearing [specific outfit with colors].
  [Any distinctive feature].
```

Define the character anchor ONCE and repeat it in every prompt of the set. This maximizes consistency across separate AI generations.

## 나노바나나 10장+ 배치 생성 프로세스

### 핵심 원칙: 1-Hop Rule

**AI 이미지를 AI에 다시 넣으면 2-3회 후 열화(일그러짐) 발생.**
모든 이미지는 반드시 "앵커 원본"으로부터 1세대(1-hop)만 거쳐야 한다.

```
절대 금지: 1번→2번→3번→4번 (체인 참조 = 누적 열화)
올바른 방법: 1번→2번, 1번→3번, 1번→4번 (별 모양 = 항상 원본 참조)
```

### 10장 배치 생성 플로우

```
Phase 1: 앵커 생성 (1번 이미지)
  ┌─────────────────────────────────────────┐
  │ 캐릭터 앵커 프롬프트로 1번 이미지 생성   │
  │ → 치료사 확인: "이 캐릭터/스타일 OK?"    │
  │ ├─ NO → 프롬프트 조정 후 재생성          │
  │ └─ YES → 1번 = 앵커 이미지 확정 ★       │
  │          앵커 프롬프트 원문 저장 (리셋용)  │
  └─────────────────────────────────────────┘

Phase 2: 배치 생성 (항상 1번만 참조)
  ┌─────────────────────────────────────────┐
  │ Batch A: 1번 + 프롬프트2 → 2번          │
  │          1번 + 프롬프트3 → 3번          │
  │          1번 + 프롬프트4 → 4번          │
  │ 품질 체크: 4번까지 일관성 유지?          │
  │ ├─ YES → Batch B 계속                   │
  │ └─ NO (열화 감지) → Phase 3 리셋        │
  ├─────────────────────────────────────────┤
  │ Batch B: 1번 + 프롬프트5 → 5번          │
  │          1번 + 프롬프트6 → 6번          │
  │          1번 + 프롬프트7 → 7번          │
  │ 품질 체크                                │
  ├─────────────────────────────────────────┤
  │ Batch C: 1번 + 프롬프트8 → 8번          │
  │          1번 + 프롬프트9 → 9번          │
  │          1번 + 프롬프트10 → 10번         │
  └─────────────────────────────────────────┘

Phase 3: 리셋 프로토콜 (열화 발생 시)
  ┌─────────────────────────────────────────┐
  │ 옵션 A: 저장해둔 앵커 프롬프트로         │
  │         새 앵커(1번B) 생성               │
  │         → 1번B로 나머지 배치 계속        │
  │                                         │
  │ 옵션 B: 완전 재시작                      │
  │         → 앵커 프롬프트 미세 조정 후     │
  │         Phase 1부터 다시                 │
  └─────────────────────────────────────────┘
```

### 열화 감지 기준

```
다음 중 1개라도 발생하면 리셋:
  □ 캐릭터 얼굴 비율이 앵커와 20%+ 차이
  □ 색상 톤이 앵커 대비 눈에 띄게 변화
  □ 윤곽선 굵기가 불일치
  □ 캐릭터 의상/머리 색상 변경
  □ 전체적인 "느낌"이 다른 시리즈 같음
```

### 앵커 프롬프트 구조 (저장용)

10장 세트의 모든 프롬프트에 동일하게 삽입되는 고정 블록:

```
=== ANCHOR BLOCK (모든 프롬프트에 동일 삽입) ===

Style: Clean, flat Korean children's educational illustration style.
Thick black outlines (2-3px), solid bright colors, minimal shading.
Friendly rounded shapes, age-appropriate for [age] year olds.

Character: [상세 캐릭터 앵커 — 아래 예시]
  A cute green cartoon T-Rex dinosaur character with:
  - Rounded friendly body shape, standing upright
  - Big expressive dark brown eyes with white highlights
  - Small white teeth visible in a friendly mouth
  - Short stubby arms with 3 fingers each
  - A lighter green belly patch
  - Approximately 60% of frame height

Print: No text. A4 size. Clear at print resolution.
=== END ANCHOR BLOCK ===
```

### 프롬프트 변형 규칙 (2-10번)

앵커 블록은 **한 글자도 바꾸지 않는다.** 변하는 것:

| 고정 (앵커 블록) | 변동 (시트별) |
|----------------|-------------|
| 캐릭터 외형 | 장면/배경 |
| 아트 스타일 | 활동 유형 (같은것찾기→분류 등) |
| 윤곽선/색상 톤 | 객체/사물 종류 |
| 프린트 규격 | 감정 표현 |
| 네거티브 프롬프트 | 난이도 파라미터 (항목 수 등) |

### 나노바나나 CLI 배치 실행 예시

```bash
# Phase 1: 앵커 생성
inference.sh -p "$(cat anchor_prompt.txt)" -a 3:4 -r 2k -o anchor.png

# Phase 2: 배치 (항상 앵커 참조)
inference.sh -i anchor.png -p "$(cat sheet2_prompt.txt)" -a 3:4 -r 2k -o sheet2.png
inference.sh -i anchor.png -p "$(cat sheet3_prompt.txt)" -a 3:4 -r 2k -o sheet3.png
inference.sh -i anchor.png -p "$(cat sheet4_prompt.txt)" -a 3:4 -r 2k -o sheet4.png
# ... 항상 anchor.png 참조, 절대 sheet2→sheet3 체인 금지

# Phase 3: 리셋 필요 시
inference.sh -p "$(cat anchor_prompt.txt)" -a 3:4 -r 2k -o anchor_v2.png
# anchor_v2.png로 나머지 배치 계속
```

### 10장 세트 프롬프트 출력 형식

therapy-master가 10장 세트 요청 시 출력하는 형식:

```
=== 10장 세트: 민준이 감정추론 시리즈 ===

앵커 프롬프트 (1번 — 저장 필수):
  [앵커 블록 + Sheet 1 장면]

Sheet 2 프롬프트 (1번 이미지 참조 필수):
  "Maintaining the exact same character and style as the reference image."
  [앵커 블록 + Sheet 2 장면]

Sheet 3 프롬프트 (1번 이미지 참조 필수):
  "Maintaining the exact same character and style as the reference image."
  [앵커 블록 + Sheet 3 장면]

...Sheet 10까지

리셋 프롬프트 (열화 시 사용):
  [앵커 블록 원문 — 1번과 동일]

※ 모든 시트는 반드시 1번(앵커) 이미지만 참조.
※ 2번→3번 체인 참조 절대 금지.
※ 3장 생성 후 품질 체크 권장.
```

## Batch & Set Generation

### Progressive Difficulty Set

When therapist requests "3장 세트" or "쉬운→어려운":

Output 3 separate prompts sharing the same theme and character anchor:
1. **Sheet 1 (Easy):** [N=3-4 items, very different, white bg]
2. **Sheet 2 (Medium):** [N=5-6 items, somewhat similar, light bg]
3. **Sheet 3 (Hard):** [N=7-8 items, very similar, scene bg]

Each prompt includes the same character/object anchor description for visual consistency.

### Multi-Child Batch

When therapist lists multiple children (e.g., "1) 민준이... 2) 서연이..."):

Parse each child separately and output numbered prompts:

```
--- 아동 1: 민준이 (6세, ASD L1) ---
[조건: 감정추론 / 기능연령 6세 / Medium / 일러스트]

[Full prompt for 민준이]

--- 아동 2: 서연이 (4세, 언어지연) ---
[조건: 같은것찾기 / 기능연령 4세 / Easy / 일러스트 + 텍스트라벨]

[Full prompt for 서연이]
```

## Negative Prompts

### Standard (Style A - Flat Illustration)
```
Negative: text, words, letters, numbers, watermarks, signatures,
photorealistic, 3D render, anime style, abstract art, dark colors,
complex textures, gradients, drop shadows, busy backgrounds,
ambiguous expressions, scary elements, violence
```

### Low-Stimulation (Style B)
```
Negative: text, words, letters, numbers, watermarks, signatures,
photorealistic, 3D render, anime, abstract art, bright/saturated colors,
red, orange, high contrast, complex textures, gradients, shadows,
busy backgrounds, sharp edges, scary elements, violence
```

### Photorealistic (Style C)
```
Negative: text, words, watermarks, logos, brands visible,
cartoon, illustration, artistic filters, HDR, oversaturated,
busy backgrounds, multiple items overlapping, blurry,
low resolution, scary elements
```

## Common Themes for Korean Therapy Context

- **일상 사물:** 컵, 숟가락, 칫솔, 신발, 가방, 우산, 시계, 연필
- **음식:** 사과, 바나나, 우유, 밥, 빵, 김치, 떡, 과자
- **동물:** 강아지, 고양이, 토끼, 곰, 물고기, 새, 나비
- **탈것:** 자동차, 버스, 자전거, 비행기, 배, 기차
- **감정:** 행복, 슬픔, 화남, 놀람, 두려움, 부끄러움
- **장소:** 집, 학교, 공원, 마트, 병원, 놀이터
- **계절/날씨:** 봄꽃, 여름바다, 가을낙엽, 겨울눈, 비, 해
- **아이 관심사:** 공룡, 로봇, 공주, 자동차, 동물, 우주

## Prompt Generation Workflow (Final Checklist)

1. **Parse input** — extract diagnosis, age, worksheet type, theme, difficulty, style
2. **Normalize diagnosis** — map 자폐등급→ASD Level, detect comorbidities
3. **Calculate functional age** — adjust for cognitive delay
4. **Apply smart defaults** — fill any missing parameters
5. **Echo assumptions** — tell the therapist what you're generating
6. **Select art style** — A (default), B (sensory), or C (photo)
7. **Check text label policy** — language therapy context?
8. **Select worksheet template** — from the 7 types above
9. **Apply difficulty modifiers** — cross-reference functional age + ASD level
10. **Generate prompt** — fill template with specific objects/scenes
11. **Add negative prompt** — matching the selected style
12. **If batch/set** — output multiple numbered prompts with shared anchors
