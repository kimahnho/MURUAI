# 아동 선택 하이브리드 UX + 학습지 크로스 적용 기능

## 요약

치료사가 아동을 선택하는 UX를 하이브리드 방식(자연어 인식 + 입력창 좌측 아바타 버튼)으로 개선하고,
A아동의 학습지를 B아동 수준에 맞게 대화형으로 변환하는 크로스 적용 기능을 추가한다.

---

## 1. 아동 선택 하이브리드 UX

### 현재 문제
- 자연어로만 아동 인식 → 등록된 아동이 있어도 매번 이름을 타이핑해야 함
- 아동이 선택 안 된 상태에서 "학습지 만들어줘" → 도메인 감지 실패 크래시
- StudentsPage와 TherapyPage의 학생 저장소가 분리되어 있음 (`therapy_students` vs `muruai_students`)

### 설계

#### A. 입력창 좌측 아바타+이름 버튼

```
┌──────────────────────────────────────────────────┐
│ [민 민준 ▾]  [아동 정보를 입력하세요...]    [▶]  │
└──────────────────────────────────────────────────┘
```

- **미선택 상태**: `[👤 아동 선택 ▾]` 텍스트 버튼 (회색)
- **선택 상태**: `[민 민준 ▾]` 이니셜 아바타 + 이름 (primary 색)
- 클릭 시 드롭다운 팝오버:
  - 검색 입력란 (이름 검색)
  - 최근 세션 아동 목록 (최대 5명, `getRecentStudents()` 활용)
  - 전체 아동 목록 (스크롤)
  - 하단: "+ 새 아동 등록" 버튼
- 아동 선택 시: `useTherapyStore.setSelectedStudent()` 호출 → 컨텍스트 바 업데이트

#### B. 자연어 인식 유지

- 기존 `analyzeInput` → `findStudentByName` 흐름 그대로 유지
- 대화 중 아동 이름 언급 시 자동 인식 + 아바타 버튼에 반영
- 두 경로 모두 같은 `setSelectedStudent()` 액션 사용

#### C. 저장소 통합

- `StudentsPage`의 `therapy_students` 키를 `muruai_students`로 통합
- `StudentProfile` 인터페이스를 `StoredStudent`로 교체
- 단일 저장소 = 한 곳에서 등록된 아동이 어디서든 보임

### 수정 파일

| 파일 | 변경 내용 |
|------|-----------|
| `TherapyGeneratePanel.tsx` | 입력창 좌측에 `StudentPickerButton` 컴포넌트 추가 |
| `components/StudentPickerButton.tsx` | **신규** — 아바타+이름 버튼 + 드롭다운 팝오버 |
| `store/useTherapyStore.ts` | 변경 없음 (기존 `setSelectedStudent` 활용) |
| `data/studentStorage.ts` | 변경 없음 (기존 API 그대로 사용) |
| `pages/StudentsPage.tsx` | 저장소 키를 `muruai_students`로 통합, `StoredStudent` 사용 |
| `pages/TherapyPage.tsx` | 컨텍스트 바의 "아동 변경" 동작 연결 |

### 구현 단계

**Step 1: StudentPickerButton 컴포넌트 생성**

```
경로: src/features/therapy/components/StudentPickerButton.tsx
```

- Props: 없음 (Zustand store에서 직접 읽음)
- 상태: `isOpen` (드롭다운), `search` (검색어)
- 데이터: `getAllStudents()`, `getRecentStudents(5)` 호출
- 이벤트: 아동 선택 시 `setSelectedStudent()` + 드롭다운 닫기
- 스타일: 기존 디자인 시스템 (`bg-primary-50`, `text-primary`, `rounded-xl`)

**Step 2: TherapyGeneratePanel 입력 영역 수정**

```
파일: TherapyGeneratePanel.tsx (line 1250-1280)
```

- 입력 바 영역에 `<StudentPickerButton />` 추가
- 레이아웃: `flex items-center gap-2` 안에 버튼 → input → 전송 버튼

**Step 3: 저장소 통합**

```
파일: StudentsPage.tsx (line 9-10)
```

- `STUDENTS_KEY = "therapy_students"` → `"muruai_students"`로 변경
- `StudentProfile` 인터페이스 → `StoredStudent` import로 교체
- `loadSessions()`도 `getSessionLogs()` 재활용

---

## 2. 학습지 크로스 적용 (대화형 변환)

### 설계

A아동의 학습지를 B아동에게 적용하는 두 가지 진입점:

#### 진입점 A: 세션 이력에서 버튼 클릭

```
StudentsPage → 세션 이력 → [이 학습지를 다른 아동에게 ▶] 버튼
→ TherapyPage로 이동 (query: ?adapt=<sessionLogId>&target=<studentName>)
→ AI가 자동으로 변환 제안
```

#### 진입점 B: 대화로 요청

치료사가 대화 중 자연어로 요청:
- "아까 민준이한테 만든 감정추론 학습지를 서연이한테도 써줘"
- "이걸 지호한테 맞게 조정해줘"

### 변환 로직

```typescript
// therapyAgent.ts에 추가할 함수
export async function adaptSessionForStudent(
  sourceSet: SessionSheetSet,       // A아동의 원본 세션 세트
  targetStudent: TherapyStudent,    // B아동 프로필
): Promise<SessionSheetSet>
```

**변환 파라미터 (AI가 자동 조정):**

| 파라미터 | 조정 기준 |
|----------|-----------|
| `difficulty` | B아동의 `autoLearned.effective.optimalDifficulty` 또는 진단 기반 |
| `itemCount` | 난이도에 연동 (easy=3, medium=5, hard=7) + 진단 보정 |
| `level` | B아동의 `autoLearned.domainAccuracy` 추이 기반 |
| `theme` | B아동의 `autoLearned.effective.themes` 우선, 없으면 원본 유지 |
| `style` | B아동의 진단에 따른 `ImageStyle` 적용 (`low_stimulation` 등) |
| `overlayLabels` | 원본 유지 (내용은 같되 개수만 조정) |
| `imagePrompt` | 테마 변경 시 재생성, 아니면 원본 유지 |

**변환 NOT 변경:**
- `worksheetType` — 활동 유형은 유지 (감정추론은 감정추론으로)
- `domain` — 도메인 유지
- `sheetRole` — 세션 구조(도입→연습→심화) 유지
- `sequenceRationale` — 교수법 설계는 유지

### 대화형 변환 UX Flow

```
치료사: "아까 민준이한테 만든 감정추론을 서연이한테도 써줘"

AI (analyzeInput → intent: "adapt"):
  1. sourceSet 매칭: 민준이의 최근 세션 로그에서 감정추론 세트 검색
  2. targetStudent 매칭: "서연" → findStudentByName()
  3. adaptSessionForStudent() 호출
  4. 변환 결과를 draftProposal 형태로 제시:

무: "민준이의 감정추론 학습지를 서연이(4세, 언어발달지연)에 맞게 조정했어요.

    변경 사항:
    • 난이도: 보통 → 쉬움 (서연이 첫 감정추론)
    • 항목 수: 5개 → 3개
    • 테마: 공룡 → 유지 (서연이 선호 테마 없음)
    • 스타일: 기본 → 저자극 (언어지연 적응)

    [이대로 만들기] [난이도 올리기] [다시 상담]"
```

### 수정 파일

| 파일 | 변경 내용 |
|------|-----------|
| `ai/therapyAgent.ts` | `adaptSessionForStudent()` 함수 추가, `analyzeInput`에 `adapt` intent 추가, `INPUT_ANALYSIS_SCHEMA`에 adapt 관련 필드 추가 |
| `components/TherapyGeneratePanel.tsx` | `handleMessage`에 `adapt` intent 처리 분기 추가 |
| `pages/StudentsPage.tsx` | 세션 이력 항목에 "다른 아동에게 적용" 버튼 추가 |
| `data/studentStorage.ts` | `getSessionLogById()` 함수 추가 |
| `model/therapyTypes.ts` | `ConversationIntent`에 `adapt` 타입 추가 |

### 구현 단계

**Step 1: 타입 확장**

```
파일: therapyTypes.ts (line 414 부근)
```

- `ConversationIntent`에 추가:
  ```typescript
  | { type: "adapt"; sourceStudentName: string; targetStudentName: string; sourceActivity?: string }
  ```

**Step 2: adaptSessionForStudent 함수 구현**

```
파일: therapyAgent.ts (새 함수)
```

- 원본 `SessionSheetSet`의 각 `sheet.result`를 복사
- B아동의 프로필(진단, autoLearned) 기반으로 파라미터 재조정
- 가드레일 `enforceGuardrails()` 재적용
- 새 `sessionId` 발급
- Gemini 호출 없이 규칙 기반으로 즉시 변환 (빠른 응답)

**Step 3: analyzeInput에 adapt 인텐트 감지 추가**

```
파일: therapyAgent.ts (line 1917 부근 — analyzeInput 시스템 프롬프트)
```

- 시스템 프롬프트의 의도 분류에 `adapt` 추가:
  ```
  - adapt: 기존에 만든 학습지를 다른 아동에게 적용/변환해 달라는 요청
  ```
- `INPUT_ANALYSIS_SCHEMA`에 `adaptSource`, `adaptTarget` 필드 추가
- fallback: 하드코딩 패턴 `다른 아동|~한테도|~에게도|변환|적용` 추가

**Step 4: TherapyGeneratePanel에 adapt 처리 추가**

```
파일: TherapyGeneratePanel.tsx (line 780 — switch문)
```

- `case "adapt":` 분기 추가
- sourceSet 검색: `getSessionLogs(sourceStudentId)` → 최근 매칭
- `adaptSessionForStudent()` 호출
- 결과를 `draftProposal` 메시지로 표시

**Step 5: StudentsPage에 "다른 아동에게" 버튼 추가**

```
파일: StudentsPage.tsx (line 239-270 — 세션 이력 영역)
```

- 각 세션 기록 우측에 아이콘 버튼 추가
- 클릭 시: `navigate(\`/therapy?adapt=${session.id}\`)`
- TherapyPage에서 query param 읽어서 자동 처리

---

## Acceptance Criteria

### 아동 선택 UX
- [ ] 입력창 좌측에 아바타+이름 버튼이 표시된다
- [ ] 미선택 시 "아동 선택" 텍스트가 보인다
- [ ] 클릭 시 드롭다운에 최근 아동 5명 + 전체 목록이 표시된다
- [ ] 검색으로 아동을 필터링할 수 있다
- [ ] 드롭다운에서 아동 선택 시 컨텍스트 바에 즉시 반영된다
- [ ] 자연어로 이름 언급 시 기존처럼 자동 인식 + 아바타 버튼에도 반영된다
- [ ] StudentsPage와 TherapyPage가 같은 저장소를 사용한다

### 학습지 크로스 적용
- [ ] "민준이한테 만든 거 서연이한테도" 같은 자연어로 크로스 적용이 작동한다
- [ ] 변환 시 난이도, 항목 수, 스타일이 B아동 프로필에 맞게 자동 조정된다
- [ ] 변환 결과가 draftProposal 형태로 표시되어 치료사가 확인/수정할 수 있다
- [ ] 워크시트 타입(활동 유형)과 도메인은 유지된다
- [ ] StudentsPage 세션 이력에서 "다른 아동에게" 버튼으로도 진입 가능하다
- [ ] 가드레일이 변환된 결과에도 적용된다

---

## 리스크 & 완화

| 리스크 | 완화 |
|--------|------|
| 드롭다운이 모바일에서 겹침 | `max-h-60 overflow-y-auto` + `fixed` 포지셔닝으로 뷰포트 내 유지 |
| 아동 많을 때 드롭다운 성능 | 가상화 불필요 (치료사당 아동 수 보통 20명 이하), 검색 필터로 충분 |
| adapt 인텐트 오감지 | Gemini fallback + "이걸 ~에게" 같은 하드코딩 패턴 병행 |
| sourceSet 매칭 실패 | 최근 세션이 없으면 "어떤 학습지를 적용할까요?" 명확화 질문 |
| 저장소 통합 시 기존 데이터 손실 | 마이그레이션: 앱 로드 시 `therapy_students` → `muruai_students` 병합 |

---

## 구현 순서 (권장)

1. **Step 1-3**: 아동 선택 UI (StudentPickerButton + 통합) — 독립적이라 먼저 가능
2. **Step 4-5**: 크로스 적용 타입/함수 — UI 없이 로직만 먼저
3. **Step 6-7**: 크로스 적용 UI 연동 — 1번 완료 후 자연스럽게 연결

총 예상 변경: 1개 신규 파일 + 5개 수정 파일
