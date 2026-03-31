/**
 * 대화 처리기 — 임상 질문/상담/관찰 공유에 대한 전문가 응답.
 * 학습지 생성이 아닌 대화 의도에 대해 별도 Gemini 호출로 응답.
 * 신호 추출: theme_preference, behavior, attention, difficulty, strategy, context
 */
import type { TherapyDomain } from "../model/therapyTypes";
import { getGenAI } from "@/shared/api/genai";

export interface ConversationSignal {
  type: "theme_preference" | "behavior" | "attention" | "difficulty" | "strategy" | "context" | "sensory" | "regression" | "motivation";
  value: string;
  confidence: number;
}

export interface ConversationResponse {
  message: string;
  signals: ConversationSignal[];
  suggestedActions: Array<{ label: string; message: string }>;
}

const CONVERSATION_SCHEMA = {
  type: "object" as const,
  properties: {
    message: { type: "string" as const, description: "치료사에게 보여줄 응답. 한국어, 친근한 전문가 톤, 3~5문장." },
    signals: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          type: { type: "string" as const },
          value: { type: "string" as const },
          confidence: { type: "number" as const },
        },
        required: ["type", "value", "confidence"],
      },
    },
    suggestedActions: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          label: { type: "string" as const, description: "버튼 표시 텍스트 (한국어)" },
          message: { type: "string" as const, description: "클릭 시 입력될 텍스트 (한국어)" },
        },
        required: ["label", "message"],
      },
    },
  },
  required: ["message", "signals", "suggestedActions"],
};

/**
 * 치료사의 대화/질문에 전문가로서 응답하고 유용한 신호를 추출한다.
 */
export async function handleConversation(
  text: string,
  context?: {
    studentName?: string;
    currentDomain?: TherapyDomain;
    sessionHistory?: string[];
  },
): Promise<ConversationResponse> {
  const systemPrompt = `당신은 발달장애 아동 전문 언어재활사(SLP) 어시스턴트입니다.
치료사가 세션 중에 질문하거나 상담을 요청할 때 전문적이고 실용적인 답변을 제공합니다.

## 역할
- 치료사의 전문성을 존중하면서 보조적 의견을 제공합니다
- "~하세요"가 아니라 "~해보시는 건 어떨까요?" 톤으로 답합니다
- 짧고 실용적으로 답합니다 (3~5문장)
- 학습지 생성 관련 질문이면 "학습지를 만들어드릴까요?"로 연결합니다

## 신호 추출
대화에서 아동에 대한 유용한 정보가 있으면 추출하세요:
- theme_preference: 아동이 좋아하는/반응하는 테마
- behavior: 행동 관찰 (거부 반응 등)
- attention: 주의력/참여도
- difficulty: 난이도 관련 관찰
- strategy: 효과적인 전략
- context: 세션 맥락

${context?.studentName ? `현재 아동: ${context.studentName}` : ""}
${context?.currentDomain ? `현재 도메인: ${context.currentDomain}` : ""}
${context?.sessionHistory?.length ? `\n최근 대화:\n${context.sessionHistory.slice(-8).join("\n")}` : ""}`;

  try {
    const ai = getGenAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-lite",
      contents: [{ role: "user", parts: [{ text }] }],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: CONVERSATION_SCHEMA,
      },
    });

    const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) throw new Error("Empty response");
    return JSON.parse(responseText) as ConversationResponse;
  } catch {
    // Fallback: 패턴 기반 간단 응답
    const signals: ConversationSignal[] = [];
    const actions: Array<{ label: string; message: string }> = [];

    const themeMatch = text.match(/(강아지|고양이|공룡|자동차|로봇|동물|바다|우주)/g);
    if (themeMatch) {
      const preferred = themeMatch[themeMatch.length - 1];
      signals.push({ type: "theme_preference", value: preferred, confidence: 0.8 });
      actions.push({ label: `${preferred} 테마로 변경`, message: `${preferred} 테마로 바꿔` });
    }
    if (/반응|관심|좋아|집중/.test(text)) {
      signals.push({ type: "attention", value: text.slice(0, 50), confidence: 0.7 });
    }
    if (/거부|울|싫어|안\s*해/.test(text)) {
      signals.push({ type: "behavior", value: text.slice(0, 50), confidence: 0.8 });
    }

    let message = "좋은 관찰이에요. ";
    if (themeMatch) {
      message += `${themeMatch[themeMatch.length - 1]}에 반응이 좋다면 테마를 바꿔보시는 건 어떨까요?`;
    } else if (/어떻게/.test(text)) {
      message += "아동의 현재 상태를 좀 더 알려주시면 구체적인 전략을 제안해드릴 수 있어요.";
    } else {
      message += "세션 중 관찰하신 내용을 기록해두면 다음 학습지 생성에 반영할게요.";
    }

    if (actions.length === 0) {
      actions.push({ label: "학습지 만들기", message: "학습지 만들어줘" });
    }

    return { message, signals, suggestedActions: actions };
  }
}
