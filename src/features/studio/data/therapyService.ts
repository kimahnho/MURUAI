/**
 * 치료 AI 서비스 — Gemini API 호출 + Supabase CRUD.
 * - 개발 모드(VITE_GOOGLE_API_KEY + DEV): 브라우저에서 Gemini 직접 호출
 * - 프로덕션: /api/genai/studio 서버 프록시 경유
 */
import { supabase } from "@/shared/api/supabase";
import { getGenAI } from "@/shared/api/genai";
import type {
  TherapyDomain,
  ChatMessage,
  TherapySession,
  TherapyStudentProfile,
  SessionEvaluation,
} from "../model/therapyTypes";

// ── API 호출 ──

interface StudioApiParams {
  contents: Array<{ role: string; parts: Array<{ text: string }> }>;
  domain?: TherapyDomain;
  lightweight?: boolean;
  autoLearnedContext?: string;
  studentDiagnosis?: string;
  studentOverlay?: string;
  therapistOverlay?: string;
  responseSchema?: Record<string, unknown>;
}

interface StudioApiResponse {
  candidates?: Array<{
    content: { parts: Array<{ text: string }>; role: string };
  }>;
  safetyBlocked?: boolean;
  crisisDetected?: boolean;
  error?: string;
}

const isDev = import.meta.env.DEV && !!import.meta.env.VITE_GOOGLE_API_KEY;

export async function callStudioApi(params: StudioApiParams): Promise<StudioApiResponse> {
  // 개발 모드: Gemini 직접 호출 (도메인 레퍼런스 없이 — 서버 전용이므로)
  if (isDev) {
    const ai = getGenAI();
    const systemInstruction = buildDevSystemInstruction(params);
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-lite",
      contents: params.contents,
      config: {
        systemInstruction,
        maxOutputTokens: 8192,
        temperature: 0.5,
        responseMimeType: "application/json",
        ...(params.responseSchema && { responseSchema: params.responseSchema }),
      },
    });
    return response as StudioApiResponse;
  }

  // 프로덕션: 서버 프록시 경유
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch("/api/genai/studio", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `API error: ${response.status}`);
  }

  return response.json();
}

// ── 도메인별 임상 전문 지식 (refs/*.md 핵심 요약) ──

const DOMAIN_REF_KNOWLEDGE: Record<string, string> = {
  language: `## 언어치료 전문가 지식 (language.md)
### 자음 습득 연령(75%기준): 2세 ㅂ*ㄱ*ㅍㅎㅌㅋ / 3세 ㅂㄷㅁㄴㅈㅊㅉㄱㅇ종성 / 4세 ㅅ / 5세 ㄹ / 6-7세 완성
### 조음 오류 패턴: 대치(위치/방법혼동→변별→산출) / 생략(음소표상미형성→인식→산출) / 왜곡(운동조절→조음점교정)
### 다중 음소 우선순위: 1)발달순서(일찍습득부터) 2)자극반응도(모방가능부터) 3)기능적영향(고빈도=소통영향↑) 4)가시성(양순>연구개)
### 단어뱅크:
- ㅅ 초성: 소,새,손,사과,신발,소방차,사자,수박,세수,숟가락 / 종성: 옷,밤,컵,버스,가스,우산
- ㄹ 종성: 달,물,별,이불,우물 / 어중: 우리,머리,거리,노리,달리기
- ㄱ 초성: 공,개,곰,가방,거울,기차,고구마,국수 / 종성: 책,떡,목,수박,색깔
- ㅁ 초성: 물,뭐,엄마,모자,문,말 / 종성: 감,곰,밤,이름,나무
- ㄴ 초성: 나,눈,네,노래,나비,나무 / 종성: 손,문,산,바나나
- ㅂ 초성: 밥,불,바,버스,비,바나나
### 음운변동별 최소대립쌍: 전방화(곰/돔,공/동) / 파열음화(사과/다과) / 종성생략(밥/바,곰/고)
### 수용·표현 언어 수준: 12-18m 첫단어→18-24m 50단어+2어문장→24-36m 3어문장+동사→36-48m 복문+조사→48m+ 담화
### 문장 구조 위계: 1어(명명)→2어(행위자+행위)→3어(+목적어)→4어(+장소/수식)→복문(접속/종속/관계)`,

  emotion: `## 감정치료 전문가 지식 (emotion.md)
### 감정 발달 단계(계층적, 건너뛸 수 없음):
- L0 얼굴주의: 시선2초유지 선수기술 / L1 표정매칭: 같은표정짝짓기(시각변별)
- L1-T 표현양식전이: 실물사진↔일러스트 매칭 / L2 감정명명: 표정→감정단어
- L3 상황기반추론: 상황만으로감정추론(인과) / L3-G 일반화: 매체/맥락넘어적용
- L4 복합상황추론 / L4+ 혼합감정인식 / L5 관점취하기(마음이론)
### ASD 감정 특성: 표정인식 지연, 복합감정 어려움, 자기감정 인식 저하(alexithymia)
### 감정 단어 위계: 기본4(행복/슬픔/화남/무서움)→확장6(+놀람/역겨움)→세분화(짜증/부끄러움/걱정/질투/당황/외로움/지루함)
### 활동 설계: L1-2는 같은것찾기/짝맞추기, L3+는 감정추론(상황장면+감정선택지), L4+는 순서맞추기+생각풍선
### ASD L2: 선택지 차이 극대화(행복vs슬픔), 배경 제거, 3항목이하 / ASD L3: 2항목+easy고정`,

  cognition: `## 인지치료 전문가 지식 (cognition.md)
### 인지 발달 5단계(기능연령 기준):
- Stage1 기초지각(2-3세): 색상/형태매칭, 1:1대응
- Stage2 구체적분류(3-4세): 범주분류(동물vs탈것), 크기서열3단계
- Stage3 관계추론(4-5세): 기능적연관(우산-비), 원인-결과2단계, 시간순서3컷
- Stage4 추상추론(5-7세): 교차분류(빨간+동물), 유추(A:B=C:?), 규칙발견
- Stage5 메타인지(7세+): 전략적계획, 자기모니터링, 실행기능
### 분류 수준 5단계: 지각적동일→기능적범주→상위범주→교차분류→위계적분류
### ADHD 동반: 항목수-1, 한페이지3분이내, 시각잔류추가, 배경최소화
### 지적장애: 기능연령보정 필수, 실물사진스타일, 최소항목, 반복기회증가`,

  motor: `## 소근육치료 전문가 지식 (motor.md)
### 소근육 발달 이정표:
- 1-2세: 손바닥잡기→집기출현, 끄적임, 블록2-3개
- 2-3세: 디지털잡기출현, 수직선/원형, 책장넘기기
- 3-4세: 미성숙3점잡기, 가위직선자르기, 작은구슬끼우기
- 4-5세: 3점잡기안정, 십자/사각형, 색칠범위내, 젓가락시도
- 5-6세: 성숙3점잡기, 삼각형/대각선/이름쓰기
- 6-7세: 성인형연필잡기, 유창한글씨, 복잡도형자르기
### 잡기 위계: 손바닥잡기→디지털잡기→미성숙3점→성숙3점잡기(Dynamic Tripod)
### 활동 위계: 찢기→구기기→큰선긋기→작은선긋기→색칠→가위직선→가위곡선→따라쓰기→자유쓰기
### 4세미만: 글자따라쓰기 금지→선긋기로 변경 / 5세미만: 소근육도메인 따라쓰기→선긋기
### DCD/CP: 운동부하감소, 넓은선/큰도형, 한손사용레이아웃`,

  social: `## 사회성치료 전문가 지식 (social.md)
### 사회 발달 6단계:
- Stage1 사회적인식(2-3세): 타인존재인식, 사회적참조, 공동주의기초
- Stage2 기초상호작용(3-4세): 인사/작별, 이름부르기, 순서지키기(2인)
- Stage3 협력놀이(4-5세): 공동목표활동, 나누기/빌리기, 감정기반반응
- Stage4 사회규칙이해(5-6세): 학교규칙, 상황적절성판단, 거짓말/진실구별
- Stage5 복잡한사회상호작용(6-8세): 갈등해결, 타협/협상, 그룹내역할수행
- Stage6 고급사회인지(8세+): 유머/비꼬기이해, 자기옹호, 온라인예절
### ASD 특화: 명시적규칙교수, 시각적사회스크립트, O/X비교(적절vs부적절행동)
### 한국문화맥락: 존댓말사용, 세배/인사, 줄서기, 선생님호칭, 또래관계위계
### 취학전환기(6-7세): 줄서기/손들기/차례지키기 등 학교규칙 핵심목표`,

  play: `## 놀이치료 전문가 지식 (play.md)
### 놀이 발달 6단계:
- Stage1 탐색/감각놀이(0-18m): 감각적속성탐색(만지기,입에넣기,두드리기)
- Stage2 기능놀이(18-24m): 사물기능에맞게사용(차굴리기,숟가락먹는흉내)
- Stage3 구성놀이(2-3세): 사물조합(쌓기,끼우기,조립) → 블록쌓기,퍼즐
- Stage4 상징놀이(3-5세): 대체놀이(바나나=전화기) → 인형밥먹이기
- Stage5 사회극놀이(4-6세): 역할배분+이야기만들기 → 병원놀이(의사/환자)
- Stage6 규칙놀이(6-8세): 규칙이해+순서지키기+승패수용 → 보드게임,윷놀이
### ASD 놀이특성: 반복적/제한적놀이패턴, 상징놀이지연, 사회적놀이회피
### 중증장애(ASD_L3/ID_severe): 상징놀이이상 부적절→감각놀이Stage1수준
### 디지털과의존: 실물놀이전환우선. 점진적전환: 디지털→하이브리드→실물`,
};

// 개발 모드용 시스템 프롬프트 — SKILL.md + 도메인 ref + image-prompt.md 내장
function buildDevSystemInstruction(params: StudioApiParams): string {
  const parts = [
    `# Therapy Master — 추론 원칙 기반 치료 에이전트

당신은 10년 경력의 언어재활사이자 발달치료 전문가입니다.
치료사가 입력하면, 원칙에 따라 스스로 생각하고 판단합니다. 매뉴얼이 아닌 임상가처럼 추론합니다.

## 1. 안전 원칙 (절대 불변)
- 진단하지 않는다. "~인 것 같습니다"도 안 된다. 진단은 의료기관만.
- 의료 조언하지 않는다. 약물, 치료법 추천은 전문의 영역.
- 자해/학대/위기 → 즉시 중단, 자살예방 1393 / 정신건강 1577-0199 / 아동학대 112
- 범위 밖 판단: CAS/유창성(구강운동필수)→학습지부적절, 음성장애/연하→의뢰우선, 선택적함묵증→전문가연계, 기능연령18m미만→대체매체

## 2. 추론 원칙 (사고의 뼈대)
### 2.1 아동이해: 현재수준 + 근접발달영역 + 장벽(감각/주의/운동/동기) + 반응하는 것(관심사/강점)
### 2.2 기능연령: 실제나이 아닌 기능수준. 도메인마다 다를 수 있음. 치료사의 구체적 보고가 기본 보정값을 override.
### 2.3 활동설계: 치료 목표에서 활동이 결정됨. 7가지 템플릿에 얽매이지 마라.
- 조음→아동이 목표음소 단어를 말해야→사물그림 필요
- 감정→감정 인식/표현→상황+표정 그림
- 인지→비교/분류/추론→비교 가능한 자극 배열
- 소근육→손 움직임→가이드선/영역
- 사회성→사회적 상황 읽기→또래 상호작용 시나리오
### 2.4 난이도: 70-80% 정답이 적절(instructional level). 90%+→올리기, 50%미만→내리기
### 2.5 개인화: 관심사/이전세션경험/치료사스타일 반영. 치료사가 수정하면 그것이 정답.
### 2.6 겸양: 부족하면 부족하다고. 확신없으면 2-3 선택지 제시. 치료사 판단이 AI보다 우선.

## 3. 진단 기본 보정값
| 진단 | 기능연령보정 | 기본적응 |
|------|-------------|---------|
| ASD L1 | 연령유지 | 시각구조화, 예측가능성 |
| ASD L2 | -1~2세 | 선택지차이극대화, 배경단순화 |
| ASD L3 | -2~3세 | Easy고정, 항목2-3개, 실물사진 |
| ADHD | 연령유지 | 배경단순화, 짧은활동, 시각구조, 한페이지3분이내 |
| 지적장애 경도 | -2~3세 | 실물사진, 단순지시 |
| 지적장애 중등도 | 실제÷2 | 실물사진, 최소항목 |
| 언어발달지연 | 시각유지, 언어-1세 | 텍스트라벨포함 |
| 감각과민 | - | 저자극(파스텔,단색,낮은대비,배경제거) |

## 4. 세션 세트 설계 (5장)
각 장이 다른 인지적 요구. 활동 유형이 겹치지 않게:
1. 도입(easy): 성공경험, 85-95% 기대정답률
2. 연습(easy-medium): 목표기술 반복, 70-80%
3. 연습심화(medium): 변형된 맥락, 70-80%
4. 심화(medium-hard): 도전, 50-65%
5. 일반화(medium): 실생활 맥락 전이, 60-75%

## 5. 이미지 프롬프트 설계 (image-prompt.md)
이미지는 예쁜 그림이 아니라 **치료 도구**. 아동이 목표 행동을 수행하기 위한 시각적 자극.

### 4-Step 프로세스:
Step 1 치료목표파악: "아동이 무엇을 해야 하는가?" (말하기→사물그림, 가리키기→선택지배열, 긋기→가이드선)
Step 2 시각자극설계: 치료목표에 맞는 구체적 이미지 구성 (사물명, 배치, 수량)
Step 3 아동수준맞춤: 기능연령→항목수/복잡도, 진단→아트스타일, 관심사→테마
Step 4 프롬프트작성: 레이아웃+요소설명+아트스타일+크기+텍스트규칙

### 아트 스타일 4종:
- Flat(기본): 두꺼운 외곽선, 단색 밝은색, 둥근형태
- 저자극: 파스텔, 얇은외곽선, 흰배경만, 패턴없음
- 실물사진: 실제사물사진. 지적장애 중등도+
- 연령적합: 기능연령 낮지만 생활연령 높은 아동. 유아적캐릭터 피하기

### 안전규칙: 폭력/공포/성적 금지, 이미지안에 텍스트 넣지않음(코드오버레이), A4흑백인쇄 구분가능

## 6. imagePrompt 작성 규칙
imagePrompt 필드에 반드시 포함:
1) 치료 목표 (아동이 수행할 행동)
2) 구체적 시각 자극 (사물명, 배치, 수량)
3) 아트 스타일 (진단 적응형)
4) 레이아웃 (격자/시퀀스/비교 등)
예시: "ㅅ 초성 조음치료 짝맞추기. 왼쪽에 사과/소/수박/사자 실물사진 4개, 오른쪽에 한글 글자 카드 4개. 점선으로 연결. 흰 배경, 두꺼운 외곽선, 밝은 단색. A4 세로."

## 7. 대화 원칙
- 치료사가 질문하면 전문가로서 답하라. 학습지 요청이 아닌 질문은 대화로.
- 수정 요청: 해당 부분만 바꾸고 나머지 유지. "2번 장을 바꿔줘"→2번만 변경.
- 임상적 우려: "참고로 ~할 수 있습니다. 그래도 진행할까요?" 치료사가 이대로라면 진행.

## 8. 응답 형식 (절대 위반 금지)
항상 JSON: {"intent": "generate|modify|chat", "reply": "한국어 메시지", "sheets": [...]}
- generate/modify: sheets에 5장. chat: sheets=[]
- title: 구체적 (❌ "같은 것 찾기" → ✅ "ㅅ 소리 나는 낱말 그림과 글자 짝짓기")
- description: 치료사가 아동에게 줄 구체적 지시
- imagePrompt: 위 4-Step 프로세스에 따라 구체적으로`,
  ];

  // 도메인별 전문가 지식 동적 주입
  if (params.domain && DOMAIN_REF_KNOWLEDGE[params.domain]) {
    parts.push(`\n${DOMAIN_REF_KNOWLEDGE[params.domain]}`);
  }
  if (params.domain) {
    parts.push(`\n현재 도메인: ${params.domain}`);
  }
  if (params.studentDiagnosis) {
    parts.push(`학생 진단 정보: ${params.studentDiagnosis}`);
  }
  if (params.autoLearnedContext) {
    parts.push(`아동 학습 이력: ${params.autoLearnedContext}`);
  }
  return parts.join("\n");
}

// ── 세션 CRUD ──

export async function createSession(
  userId: string,
  domain: TherapyDomain,
  studentId?: string,
): Promise<TherapySession> {
  const { data, error } = await supabase
    .from("therapy_sessions")
    .insert({ user_id: userId, domain, student_id: studentId, status: "active", session_data: {} })
    .select()
    .single();
  if (error) throw error;
  return mapSession(data);
}

export async function completeSession(
  sessionId: string,
  evaluation?: SessionEvaluation,
): Promise<void> {
  const updates: Record<string, unknown> = {
    status: "completed",
    completed_at: new Date().toISOString(),
  };
  if (evaluation) {
    updates.evaluation = evaluation;
  }
  const { error } = await supabase
    .from("therapy_sessions")
    .update(updates)
    .eq("id", sessionId);
  if (error) throw error;
}

export async function getUserSessions(userId: string): Promise<TherapySession[]> {
  const { data, error } = await supabase
    .from("therapy_sessions")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .not("session_data->title", "is", null)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map(mapSession);
}

// ── 채팅 로그 CRUD ──

export async function saveChatMessage(
  userId: string,
  sessionId: string,
  message: ChatMessage,
): Promise<void> {
  const { error } = await supabase
    .from("therapy_chat_logs")
    .insert({
      user_id: userId,
      session_id: sessionId,
      role: message.role,
      content: message.content.slice(0, 2000),
      metadata: message.metadata ?? null,
    });
  if (error) console.warn("therapy_chat_logs insert failed", error);
}

export async function getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("therapy_chat_logs")
    .select("*")
    .eq("session_id", sessionId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    role: row.role,
    content: row.content,
    type: row.metadata?.type ?? "text",
    metadata: row.metadata,
    createdAt: row.created_at,
  }));
}

// ── 학생 치료 프로필 CRUD ──

export async function getStudentProfile(studentId: string): Promise<TherapyStudentProfile | null> {
  const { data, error } = await supabase
    .from("therapy_student_profiles")
    .select("*")
    .eq("student_id", studentId)
    .is("deleted_at", null)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null; // not found
    throw error;
  }
  return mapStudentProfile(data);
}

export async function upsertStudentProfile(
  userId: string,
  studentId: string,
  profileData: Partial<TherapyStudentProfile>,
): Promise<void> {
  const { error } = await supabase
    .from("therapy_student_profiles")
    .upsert(
      {
        user_id: userId,
        student_id: studentId,
        profile_data: profileData,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "student_id" },
    );
  if (error) throw error;
}

// ── 매퍼 ──

function mapSession(row: Record<string, unknown>): TherapySession {
  const sessionData = (row.session_data as Record<string, unknown>) ?? {};
  return {
    id: row.id as string,
    userId: row.user_id as string,
    studentId: row.student_id as string | undefined,
    title: (sessionData.title as string) ?? undefined,
    sheets: Array.isArray(sessionData.sheets) ? sessionData.sheets as TherapySession["sheets"] : undefined,
    domain: row.domain as TherapyDomain,
    status: row.status as TherapySession["status"],
    messages: [],
    evaluation: row.evaluation as SessionEvaluation | undefined,
    durationSeconds: row.duration_seconds as number | undefined,
    createdAt: row.created_at as string,
    completedAt: row.completed_at as string | undefined,
  };
}

function mapStudentProfile(row: Record<string, unknown>): TherapyStudentProfile {
  const pd = row.profile_data as Record<string, unknown> ?? {};
  return {
    id: row.id as string,
    userId: row.user_id as string,
    studentId: row.student_id as string,
    diagnosis: (pd.diagnosis as TherapyStudentProfile["diagnosis"]) ?? { comorbidities: [], rawText: "" },
    functionalAge: (pd.functionalAge as number) ?? 0,
    therapyGoals: (pd.therapyGoals as string[]) ?? [],
    articulationTargets: (pd.articulationTargets as string[]) ?? [],
    interests: (pd.interests as string[]) ?? [],
    sensoryTraits: (pd.sensoryTraits as string[]) ?? [],
    autoLearned: pd.autoLearned as TherapyStudentProfile["autoLearned"],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
