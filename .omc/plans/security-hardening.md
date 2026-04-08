# MURUAI 보안 강화 플랜

## 요약

보안 점검에서 발견된 CRITICAL/HIGH 이슈 5개를 프론트엔드 + API 라우트 수준에서 단계적으로 해결한다.
**핵심 목표**: 치료 도메인 지식과 API 키가 클라이언트에 노출되지 않도록 한다.

---

## Phase 1: API 키 노출 차단 (CRITICAL)

### 문제
- `.env.local`에 `VITE_GOOGLE_API_KEY` → 클라이언트 번들에 포함
- `api/_lib/genai.ts:8`에서 `VITE_GOOGLE_API_KEY` fallback 사용
- `api/_lib/auth.ts:10`에서 `VITE_SUPABASE_PUBLISHABLE_KEY` fallback 사용

### 수정

**파일: `.env.local`**
```diff
- VITE_GOOGLE_API_KEY=AIzaSyDgcbBC7oRihIfFXxKtu5rhS6PJWQXDm5o
+ # GOOGLE_API_KEY는 Vercel 환경변수로만 설정 (VITE_ prefix 제거)
+ # 로컬 개발 시: VITE_THERAPY_MOCK=true로 API 호출 없이 테스트
```

**파일: `api/_lib/genai.ts` (line 7-8)**
```diff
- const GOOGLE_API_KEY =
-   process.env.GOOGLE_API_KEY ?? process.env.VITE_GOOGLE_API_KEY;
+ const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
```

**파일: `api/_lib/auth.ts` (line 8-11)**
```diff
- const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
- const supabaseServiceKey =
-   process.env.SUPABASE_SERVICE_ROLE_KEY ??
-   process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
+ const supabaseUrl = process.env.SUPABASE_URL;
+ const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
```

**파일: `src/shared/api/genai.ts` (line 87-96)**
```diff
  export const getGenAI = (): GenAIClient => {
    if (!instance) {
-     const apiKey = import.meta.env.VITE_GOOGLE_API_KEY as string | undefined;
-     instance =
-       apiKey && import.meta.env.DEV
-         ? createDirectClient(apiKey)
-         : createProxyClient();
+     // 항상 프록시 사용 — API 키를 클라이언트에 노출하지 않음
+     instance = createProxyClient();
    }
    return instance;
  };
```

### Acceptance Criteria
- [ ] `VITE_GOOGLE_API_KEY`가 `.env.local`에서 제거됨
- [ ] 프로덕션 빌드 JS 번들에서 `AIzaSy` 문자열 검색 시 0건
- [ ] `api/_lib/genai.ts`에서 `VITE_` 참조 0건
- [ ] `api/_lib/auth.ts`에서 `VITE_` 참조 0건
- [ ] 로컬 개발 시 `VITE_THERAPY_MOCK=true`로 정상 동작

---

## Phase 2: 치료 도메인 지식 번들 노출 차단 (CRITICAL)

### 문제
- `buildSystemPrompt.ts:302-309`에서 8개 `.md` 파일을 `?raw` import → 클라이언트 JS에 314KB 포함
- 브라우저 DevTools에서 전문 치료 지식 전체 열람 가능

### 수정 전략
`?raw` import를 유지하되, 시스템 프롬프트 조립과 Gemini 호출 전체를 서버사이드 API 라우트로 이전.

**신규 파일: `api/genai/therapy.ts`** — 치료 전용 서버사이드 엔드포인트
```typescript
// 클라이언트는 { userPrompt, studentContext, mode } 만 전송
// 서버가 refs 로드 → 시스템 프롬프트 조립 → Gemini 호출 → 결과만 반환

export default async function handler(req, res) {
  const user = await verifyAuth(req);
  const { userPrompt, studentContext, mode } = req.body;

  // mode: "analyzeInput" | "generateSessionSet" | "imagePrompt" | "evaluate"
  // 서버에서 buildSystemPrompt() 호출 (refs는 서버 번들에만 포함)
  // Gemini 호출 후 구조화된 결과만 반환
}
```

**파일: `buildSystemPrompt.ts` 이동**
- `src/features/therapy/ai/buildSystemPrompt.ts` → `api/_lib/therapy/buildSystemPrompt.ts`
- `src/features/therapy/refs/` → `api/_lib/therapy/refs/`
- 클라이언트 코드에서 `?raw` import 완전 제거

**파일: `src/features/therapy/ai/therapyAgent.ts` 수정**
- `generateSessionSet()`: Gemini 직접 호출 → `fetch('/api/genai/therapy', { mode: "generateSessionSet", ... })`
- `analyzeInput()`: Gemini 직접 호출 → `fetch('/api/genai/therapy', { mode: "analyzeInput", ... })`
- `evaluateSession()`: 동일하게 서버 프록시
- `generateImagePromptFromDescription()`: 동일하게 서버 프록시

**클라이언트에 남는 것:**
- 타입 정의 (`therapyTypes.ts`)
- UI 컴포넌트 (`TherapyGeneratePanel.tsx` 등)
- 가드레일 감지/경고 메시지 (UX용)
- 하드코딩 detectIntent fallback (오프라인/빠른 응답용)

### Acceptance Criteria
- [ ] `src/features/therapy/refs/` 디렉토리가 `api/_lib/therapy/refs/`로 이동
- [ ] 프로덕션 빌드에서 `SKILL.md`, `emotion.md` 등의 내용이 JS 번들에 0건
- [ ] `/api/genai/therapy` 엔드포인트가 인증 필요
- [ ] 클라이언트는 `{ userPrompt, studentContext, mode }` 만 전송
- [ ] 응답에 시스템 프롬프트 내용이 포함되지 않음

---

## Phase 3: API 프록시 config 검증 (HIGH)

### 문제
- `api/genai/text.ts:47-51`에서 클라이언트가 보낸 `config`를 Gemini에 그대로 전달
- 공격자가 `safetySettings` 변경, `maxOutputTokens` 극대화 등 가능

### 수정

**파일: `api/genai/text.ts` (line 47-51)**
```diff
+ // 허용된 config 필드만 전달 (whitelist 방식)
+ const safeConfig = {
+   responseMimeType: genConfig?.responseMimeType,
+   responseSchema: genConfig?.responseSchema,
+   temperature: genConfig?.temperature != null
+     ? Math.min(Math.max(Number(genConfig.temperature), 0), 2) : undefined,
+   maxOutputTokens: genConfig?.maxOutputTokens != null
+     ? Math.min(Number(genConfig.maxOutputTokens), 8192) : undefined,
+   // safetySettings는 서버에서 고정 — 클라이언트 변경 불가
+ };

  const response = await ai.models.generateContent({
    model,
    contents,
-   config: genConfig,
+   config: safeConfig,
  });
```

**파일: `api/genai/image.ts`** — 동일하게 적용

### Acceptance Criteria
- [ ] `genConfig`가 직접 전달되지 않음
- [ ] `safetySettings`가 클라이언트에서 변경 불가
- [ ] `maxOutputTokens`가 8192 이하로 제한
- [ ] `temperature`가 0~2 범위로 제한

---

## Phase 4: Health 엔드포인트 보안 (MEDIUM)

### 문제
- `/api/health`가 인증 없이 인프라 설정 상태 노출

### 수정

**파일: `api/health.ts` (line 23-28)**
```diff
- checks.google_api_key = process.env.GOOGLE_API_KEY ? "set" : "missing";
- checks.supabase_url = (...) ? "set" : "missing";
- checks.supabase_key = (...) ? "set" : "missing";
+ // 인프라 상태는 노출하지 않음
```

간단한 상태만 반환:
```typescript
return res.status(200).json({ status: "ok", timestamp: Date.now() });
```

### Acceptance Criteria
- [ ] `/api/health` 응답에 `google_api_key`, `supabase_url`, `supabase_key` 필드 없음
- [ ] 상태 코드 200 + `{ status: "ok" }` 만 반환

---

## Phase 5: Sourcemap 설정 (MEDIUM)

### 문제
- `vite.config.ts:12`에서 `sourcemap: true` → Sentry 업로드 후 삭제하지만 실패 시 노출

### 수정

**파일: `vite.config.ts` (line 12)**
```diff
- sourcemap: true,
+ sourcemap: "hidden",  // .map 파일 생성하되 JS에 //# sourceMappingURL 미포함
```

### Acceptance Criteria
- [ ] 프로덕션 JS 파일에 `//# sourceMappingURL` 문자열 없음
- [ ] Sentry에 sourcemap 정상 업로드

---

## 구현 순서

| Phase | 대상 | 위험도 | 예상 시간 | 의존성 |
|-------|------|--------|-----------|--------|
| **1** | API 키 노출 | CRITICAL | 10분 | 없음 |
| **3** | config 검증 | HIGH | 10분 | 없음 |
| **4** | health 엔드포인트 | MEDIUM | 5분 | 없음 |
| **5** | sourcemap | MEDIUM | 2분 | 없음 |
| **2** | 도메인 지식 서버 이전 | CRITICAL | 30-60분 | Phase 1 완료 후 |

Phase 1, 3, 4, 5는 독립적이라 병렬 수정 가능.
Phase 2는 가장 큰 변경이므로 마지막에 진행.

---

## 리스크

| 리스크 | 완화 |
|--------|------|
| Phase 1 후 로컬 개발에서 Gemini 호출 불가 | `VITE_THERAPY_MOCK=true` 기본 활성화 |
| Phase 2 서버 이전 시 API 응답 구조 변경 | 기존 인터페이스 유지, 전송 레이어만 변경 |
| Phase 2 후 콜드 스타트 지연 | refs를 메모리 캐시 (모듈 레벨 변수) |
| Phase 3 config 제한으로 기존 기능 깨짐 | `responseMimeType`, `responseSchema`는 허용 |

---

## 검증

각 Phase 완료 후:
1. `npm run build` → 번들 크기 확인 (Phase 2 후 ~300KB 감소 예상)
2. 프로덕션 빌드 JS에서 `grep -r "SKILL.md\|AIzaSy\|emotion.md" dist/`
3. `/therapy` 페이지에서 학습지 생성 정상 동작
4. DevTools Network 탭에서 요청/응답에 시스템 프롬프트 미포함 확인
