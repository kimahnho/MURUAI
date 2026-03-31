/**
 * 치료 AI 채팅 메인 패널 — 메시지 목록 + 입력 바.
 * 사용자 입력 → 의도 분류 → 파이프라인 실행 → 결과 표시.
 */
import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Sparkles, RotateCcw, Bot, User } from "lucide-react";
import { motion } from "framer-motion";
import { useTherapyStore } from "../store/useTherapyStore";
import { sendMessage } from "../ai/therapyPipeline";
import { buildWorksheetImagePrompt } from "../ai/generateWorksheetImages";
import { saveChatMessage } from "../data/therapyService";
import { updateSessionSheets } from "../data/sessionService";
import type { SessionSet, ChatMessage, ImagePromptEntry } from "../model/therapyTypes";
import { captureSentryError } from "@/shared/utils/sentryUtils";
import { mp } from "@/shared/utils/mixpanel";
import TherapyChatMessage from "./TherapyChatMessage";
import StudentPickerButton from "./StudentPickerButton";
import { Avatar } from "../ui/avatar";
import { ScrollArea } from "../ui/scroll-area";
import { cn } from "../lib/utils";

interface TherapyChatPanelProps {
  onApproveSessionSet: (set: SessionSet) => void;
  onFirstMessage: (text: string) => Promise<string | undefined>;
  onNavigateToChat?: (chatId: string) => void;
  userId?: string;
  activeSessionId?: string;
}

// 예시 칩
const EXAMPLE_CHIPS = [
  "감정추론 학습지 만들어줘",
  "같은 것 찾기 쉬운 거",
  "선긋기 연습 자료",
  "사회성 순서 맞추기",
];

const TherapyChatPanel = ({ onApproveSessionSet, onFirstMessage, onNavigateToChat, userId, activeSessionId }: TherapyChatPanelProps) => {
  const [input, setInput] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastUserTextRef = useRef<string>("");
  const sessionIdRef = useRef<string | undefined>(activeSessionId);

  const phase = useTherapyStore((s) => s.phase);
  const messages = useTherapyStore((s) => s.messages);
  const selectedStudent = useTherapyStore((s) => s.selectedStudent);
  const setSelectedStudent = useTherapyStore((s) => s.setSelectedStudent);
  const sessionSet = useTherapyStore((s) => s.sessionSet);
  const warnings = useTherapyStore((s) => s.warnings);
  const addMessage = useTherapyStore((s) => s.addMessage);
  const setPhase = useTherapyStore((s) => s.setPhase);
  const setError = useTherapyStore((s) => s.setError);
  const setSessionSet = useTherapyStore((s) => s.setSessionSet);
  const setCurrentDomain = useTherapyStore((s) => s.setCurrentDomain);
  const setWarnings = useTherapyStore((s) => s.setWarnings);

  const isProcessing = phase === "analyzing" || phase === "generating";

  // activeSessionId prop → ref 동기화
  useEffect(() => {
    sessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  // store에 추가 + DB에 즉시 저장 (ref로 최신 세션 ID 참조)
  const addAndSaveMessage = (
    role: ChatMessage["role"],
    content: string,
    type?: ChatMessage["type"],
    metadata?: ChatMessage["metadata"],
  ) => {
    addMessage(role, content, type, metadata);
    const sid = sessionIdRef.current;
    if (userId && sid) {
      void saveChatMessage(userId, sid, {
        id: crypto.randomUUID(),
        role,
        content,
        type: type ?? "text",
        metadata,
        createdAt: new Date().toISOString(),
      });
    }
  };

  // 자동 스크롤
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  // "이미지 프롬프트" 요청 감지 → 현재 학습지의 실제 프롬프트를 출력
  const isImagePromptRequest = (text: string) =>
    /이미지\s*프롬프트/.test(text) && sessionSet?.sheets && sessionSet.sheets.length > 0;

  const handleImagePromptRequest = (text: string) => {
    addAndSaveMessage("user", text);
    const sheets = sessionSet!.sheets;
    const imagePrompts: ImagePromptEntry[] = sheets.map((sheet, i) => ({
      index: i,
      title: sheet.title,
      prompt: buildWorksheetImagePrompt(sheet, sessionSet!.domain),
    }));
    addAndSaveMessage(
      "assistant",
      `학습지 ${sheets.length}장의 이미지 생성 프롬프트입니다.`,
      "imagePrompt",
      { imagePrompts },
    );
  };

  // 메시지 전송 (retryText가 있으면 재시도)
  const processMessage = async (text: string, isRetry: boolean) => {
    if (!text || isProcessing) return;

    // 이미지 프롬프트 요청이면 AI 호출 없이 즉시 출력
    if (!isRetry && isImagePromptRequest(text)) {
      setInput("");
      handleImagePromptRequest(text);
      return;
    }

    lastUserTextRef.current = text;

    if (!isRetry) {
      setInput("");
      if (messages.length === 0) {
        // 첫 메시지: 세션 생성 → 즉시 navigate → 이동된 페이지에서 AI 호출
        const newSessionId = await onFirstMessage(text);
        sessionIdRef.current = newSessionId;
        addMessage("user", text);
        if (userId && newSessionId) {
          void saveChatMessage(userId, newSessionId, {
            id: crypto.randomUUID(),
            role: "user",
            content: text,
            type: "text",
            createdAt: new Date().toISOString(),
          });
          // 세션 생성 직후 즉시 이동
          onNavigateToChat?.(newSessionId);
        }
      } else {
        addAndSaveMessage("user", text);
      }
    } else {
      setError(null);
    }

    try {
      setPhase("analyzing");

      const result = await sendMessage(text, messages, selectedStudent ?? undefined, sessionSet?.sheets);

      setCurrentDomain(result.domain);
      setWarnings(result.warnings);

      if ((result.intent === "generate" || result.intent === "modify") && result.sheets && result.sheets.length > 0) {
        const newSessionSet: SessionSet = {
          id: crypto.randomUUID(),
          domain: result.domain,
          sheets: result.sheets,
        };
        setPhase("completed");
        setSessionSet(newSessionSet);
        const sid = sessionIdRef.current;
        if (sid) {
          void updateSessionSheets(sid, result.sheets);
        }
        mp.track("치료 학습지 생성", { domain: result.domain, sheet_count: result.sheets.length });
        addAndSaveMessage(
          "assistant",
          result.reply,
          "sessionSet",
          { sessionSet: newSessionSet, domain: result.domain },
        );
      } else {
        setPhase("idle");
        addAndSaveMessage("assistant", result.reply, "text");
      }

      if (result.warnings.length > 0) {
        addAndSaveMessage("assistant", result.warnings.join("\n"), "text");
      }
    } catch (err) {
      setPhase("error");
      const message = err instanceof Error ? err.message : "요청 처리에 실패했어요.";
      setError(message);
      addAndSaveMessage("assistant", `${message}\n다시 시도하려면 아래 버튼을 눌러주세요.`, "error");
      captureSentryError(err, "TherapyChatPanel 메시지 처리");
    }
  };

  const handleSend = () => {
    const text = input.trim();
    void processMessage(text, false);
  };

  const handleRetry = () => {
    if (lastUserTextRef.current) {
      void processMessage(lastUserTextRef.current, true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChipClick = (text: string) => {
    setInput(text);
    inputRef.current?.focus();
  };

  const isEmpty = messages.length === 0;

  // 공유 입력 바
  const inputBarContent = (
    <div className="flex items-center gap-2">
      {/* 아동 선택 (외부 좌측) */}
      <StudentPickerButton
        selectedStudent={selectedStudent as { id: string; name: string; significant?: string } | null}
        onSelect={(student) => setSelectedStudent(student as typeof selectedStudent)}
      />

      {/* 입력 필드 */}
      <div
        className={cn(
          "flex flex-1 items-center gap-2 rounded-2xl border-2 bg-white px-3 py-2.5 shadow-lg transition",
          isProcessing ? "border-black-20" : "border-black-25 focus-within:border-primary focus-within:shadow-xl",
        )}
      >
      <textarea
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onCompositionStart={() => setIsComposing(true)}
        onCompositionEnd={() => setIsComposing(false)}
        placeholder={isProcessing ? "응답을 기다리고 있어요..." : "학습지 만들어줘..."}
        disabled={isProcessing}
        rows={1}
        className="flex-1 resize-none bg-transparent text-14-regular leading-5 text-black-90 placeholder:text-black-40 outline-none disabled:text-black-40 min-h-5 max-h-30 py-0"
        style={{ fieldSizing: "content" } as React.CSSProperties}
      />
      <button
        type="button"
        onClick={handleSend}
        disabled={isProcessing || !input.trim()}
        className={cn(
          "flex shrink-0 h-8 w-8 items-center justify-center rounded-xl transition cursor-pointer",
          input.trim() && !isProcessing
            ? "bg-primary text-white-100 hover:bg-primary-700"
            : "bg-black-10 text-black-40 cursor-default",
        )}
      >
        {isProcessing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </button>
      </div>
    </div>
  );

  // 빈 상태: 라벨 + 입력 바를 세로 중앙에 배치 + 순차 페이드인
  if (isEmpty) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex flex-col items-center justify-center gap-8 px-4">
          {/* 아이콘 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center gap-3 text-center"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>

            {/* 제목 */}
            <motion.h2
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="text-title-22-semibold text-black-90"
            >
              무엇을 만들어 드릴까요?
            </motion.h2>

            {/* 부제 */}
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="text-14-regular text-black-50 max-w-md"
            >
              아동의 진단명, 나이, 관심사를 함께 알려주시면 더 정확해요.
            </motion.p>

            {/* 아동 선택 안내 */}
            {!selectedStudent && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.25 }}
                className="flex items-center gap-2 rounded-lg bg-primary-50 border border-primary-200 px-3 py-2"
              >
                <User className="h-4 w-4 text-primary shrink-0" />
                <span className="text-13-regular text-primary">
                  좌측 하단의 <strong>아동</strong> 버튼으로 아동을 선택하면 맞춤 학습지를 만들 수 있어요
                </span>
              </motion.div>
            )}
          </motion.div>

          {/* 입력 바 */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="w-full max-w-xl rounded-3xl bg-black-25 p-3"
          >
            {inputBarContent}
          </motion.div>

          {/* 예시 칩 */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.45 }}
            className="flex flex-wrap justify-center gap-2"
          >
            {EXAMPLE_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => handleChipClick(chip)}
                className="rounded-full border border-primary-200 bg-primary-50 px-3.5 py-1.5 text-13-regular text-primary hover:bg-primary-100 transition cursor-pointer"
              >
                {chip}
              </button>
            ))}
          </motion.div>
        </div>
      </div>
    );
  }

  // 대화 상태: 메시지 영역 + 하단 입력 바
  return (
    <div className="flex flex-col h-full">
      {/* 경고 배너 */}
      {warnings.length > 0 && (
        <div className="shrink-0 border-b border-warning-100 bg-warning-50 px-4 py-2 text-13-regular text-warning-700">
          {warnings.map((w, i) => (
            <p key={i}>{w}</p>
          ))}
        </div>
      )}

      {/* 메시지 영역 */}
      <ScrollArea ref={scrollRef} className="flex-1 px-4 py-4">
        <div className="flex flex-col gap-4">
          {messages.map((msg) => (
            <TherapyChatMessage
              key={msg.id}
              message={msg}
              onApproveSessionSet={onApproveSessionSet}
            />
          ))}
          {isProcessing && (
            <div className="flex gap-3">
              <Avatar size="sm" className="shrink-0 mt-0.5 bg-black-10 text-black-60">
                <Bot className="h-4 w-4" />
              </Avatar>
              <div className="flex items-center gap-1.5 rounded-2xl bg-black-5 px-4 py-3">
                <motion.span
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                  className="h-2 w-2 rounded-full bg-black-40"
                />
                <motion.span
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay: 0.2 }}
                  className="h-2 w-2 rounded-full bg-black-40"
                />
                <motion.span
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay: 0.4 }}
                  className="h-2 w-2 rounded-full bg-black-40"
                />
              </div>
            </div>
          )}
          {phase === "error" && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleRetry}
                className="flex items-center gap-1.5 rounded-xl border border-error-100 bg-error-50 px-4 py-2 text-13-bold text-error-700 hover:bg-error-100 transition cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                다시 시도
              </button>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* 하단 입력 바 */}
      <div className="shrink-0 border-t border-black-25 bg-black-25 px-4 py-3">
        {inputBarContent}
      </div>
    </div>
  );
};

export default TherapyChatPanel;
