/**
 * 특수교육용 이미지 소재 생성 — 메인 페이지
 *
 * 세션 기반 대화 흐름: 첫 메시지 → 세션 생성 → URL 반영 → 메시지 저장
 * 스타일 선택 UI 없음. Agent가 자동 적용.
 */
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ImagePlus, X } from "lucide-react";
import { useAuthStore } from "@/shared/store/useAuthStore";
import { useImageGenStore } from "../store/useImageGenStore";
import { ChildSelector } from "../components/ChildSelector";
import { AgentCard } from "../components/AgentCard";
import { ImageHistory } from "../components/ImageHistory";
import { ClarifyPanel } from "../components/ClarifyPanel";
import { buildImagePrompt } from "../ai/promptBuilder";
import { generateAndUpload, uploadImage } from "../ai/imageGenerator";
import { getClarifyQuestions, applyAnswers, type ClarifyQuestion } from "../ai/clarifyQuestions";
import { incrementGeneration, recordLike, recordDislike, recordRegeneration, confirmRegenerationSuccess } from "../ai/childAgent";
import { addToHistory, updateFeedback } from "../data/imageApi";
import { createSession, getUserSessions, loadSessionMessages, saveMessage } from "../data/sessionApi";
import type { GeneratedImage, ImageGenMessage } from "../model/types";

const PROMPT_REQUEST_PATTERN = /프롬프트.*(생성|만들어|작성|뽑아|줘|추출)|prompt.*(generate|create|make|extract)/i;

function isPromptOnlyRequest(input: string): boolean {
  return PROMPT_REQUEST_PATTERN.test(input);
}

interface ImageGenPageProps {
  sessionId?: string;
}

export function ImageGenPage({ sessionId }: ImageGenPageProps) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const {
    selectedChild, childAgent, phase, currentImage, error,
    setPhase, setCurrentImage, setError,
    history, setHistory,
    sessions, setSessions,
    activeSession, setActiveSession,
    messages, setMessages, addMessage,
  } = useImageGenStore();

  const [prompt, setPrompt] = useState("");
  const [isRegenerateMode, setIsRegenerateMode] = useState(false);
  const [previousPrompt, setPreviousPrompt] = useState("");
  const [pendingQuestions, setPendingQuestions] = useState<ClarifyQuestion[]>([]);
  const [pendingPrompt, setPendingPrompt] = useState("");
  const [referenceImage, setReferenceImage] = useState<{
    base64: string;
    fileName: string;
    mimeType: string;
    previewUrl: string;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string | null>(null);

  // ═══ 세션 목록 로드 ═══
  useEffect(() => {
    if (!user?.id) return;
    getUserSessions(user.id).then(setSessions);
  }, [user?.id, setSessions]);

  // ═══ sessionId 변경 → 세션 로드 또는 리셋 (Studio 패턴) ═══
  useEffect(() => {
    if (!sessionId) {
      // 생성 진행 중(세션 생성 후 navigate 전)에만 리셋 스킵
      const currentPhase = useImageGenStore.getState().phase;
      const isGeneratingNow = currentPhase === "building" || currentPhase === "generating" || currentPhase === "uploading";
      if (sessionIdRef.current && isGeneratingNow) return;

      // /image-gen — 빈 상태 초기화
      sessionIdRef.current = null;
      if (activeSession) {
        setActiveSession(null);
        setMessages([]);
        setCurrentImage(null);
        setPhase("idle");
        setError(null);
        setIsRegenerateMode(false);
        setPendingQuestions([]);
        setPendingPrompt("");
        sessionIdRef.current = null;
      }
      return;
    }

    // 이미 같은 세션이 로드되어 있으면 스킵
    if (activeSession?.id === sessionId || sessionIdRef.current === sessionId) return;

    // sessions 목록에서 찾기
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) {
      // sessions 로드 전일 수 있으므로 대기
      if (sessions.length === 0) return;
      navigate("/image-gen", { replace: true });
      return;
    }

    setActiveSession(session);
    setCurrentImage(null);
    setPhase("idle");
    setError(null);
    setIsRegenerateMode(false);
    sessionIdRef.current = sessionId;

    // 메시지 복원
    loadSessionMessages(sessionId).then((restored) => {
      setMessages(restored);
      const lastImage = [...restored].reverse().find(
        (m) => m.role === "assistant" && m.metadata?.type === "image" && m.metadata.imageUrl,
      );
      if (lastImage?.metadata) {
        setCurrentImage({
          id: lastImage.metadata.imageId ?? lastImage.id,
          childId: session.studentId ?? "",
          userId: user?.id ?? "",
          imageUrl: lastImage.metadata.imageUrl!,
          prompt: "",
          resolvedPrompt: lastImage.metadata.resolvedPrompt ?? "",
          style: lastImage.metadata.style ?? "flat",
          backgroundLevel: lastImage.metadata.backgroundLevel ?? "simple",
          complexity: lastImage.metadata.complexity ?? 3,
          feedback: null,
          createdAt: lastImage.createdAt,
        });
      }
    });
  }, [sessionId, sessions, activeSession, navigate, user?.id, setActiveSession, setMessages, setCurrentImage, setPhase, setError]);

  // ═══ 메시지 추가 시 자동 스크롤 ═══
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, phase]);

  // ═══ 메시지 저장 헬퍼 (sessionIdRef로 현재 세션 참조) ═══
  const addAndSaveMessage = (
    role: ImageGenMessage["role"],
    content: string,
    metadata?: ImageGenMessage["metadata"],
  ) => {
    const sid = sessionIdRef.current ?? "";
    const msg: ImageGenMessage = {
      id: crypto.randomUUID(),
      sessionId: sid,
      role,
      content,
      metadata,
      createdAt: new Date().toISOString(),
    };
    addMessage(msg);
    if (user?.id && sid) {
      void saveMessage(user.id, sid, msg);
    }
  };

  // ═══ 참고 이미지 첨부/제거 ═══
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      setReferenceImage({
        base64,
        fileName: file.name,
        mimeType: file.type || "image/png",
        previewUrl: URL.createObjectURL(file),
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRemoveReference = () => {
    if (referenceImage) {
      URL.revokeObjectURL(referenceImage.previewUrl);
    }
    setReferenceImage(null);
  };

  // ═══ 네비게이트 헬퍼: 세션 ID가 URL에 아직 반영 안 됐으면 navigate ═══
  // ═══ 생성 시작 ═══
  const handleGenerate = async () => {
    if (!prompt.trim() || !selectedChild || !childAgent) return;

    const currentPrompt = prompt.trim();
    setPrompt("");
    setError(null);
    setPhase("building"); // 즉시 로딩 스피너 표시

    // 첫 메시지 → 세션 생성 + 페이지 이동
    if (!activeSession && user?.id) {
      try {
        const session = await createSession(user.id, selectedChild.id, currentPrompt);
        setActiveSession(session);
        setSessions([session, ...sessions]);
        sessionIdRef.current = session.id;

        const userMsg: ImageGenMessage = {
          id: crypto.randomUUID(),
          sessionId: session.id,
          role: "user",
          content: currentPrompt,
          metadata: {
            type: "prompt",
            referenceImageUrl: referenceImage ? "pending" : undefined,
          },
          createdAt: new Date().toISOString(),
        };
        addMessage(userMsg);
        void saveMessage(user.id, session.id, userMsg);

        // 페이지 이동은 이미지 생성 완료 후 executeGenerate에서 수행
      } catch {
        setError("세션 생성에 실패했어요");
        setPhase("error");
        return;
      }
    } else {
      addAndSaveMessage("user", currentPrompt, {
        type: "prompt",
        referenceImageUrl: referenceImage ? "pending" : undefined,
      });
    }

    // 프롬프트만 생성 요청인 경우 — 이미지 생성 없이 프롬프트 텍스트 반환
    if (isPromptOnlyRequest(currentPrompt)) {
      const built = buildImagePrompt(currentPrompt, childAgent, {
        hasReferenceImage: !!referenceImage,
      });
      addAndSaveMessage("assistant", built.prompt, { type: "prompt" });
      handleRemoveReference();
      setPhase("done");

      const sid = sessionIdRef.current;
      if (sid && !window.location.pathname.includes(sid)) {
        navigate(`/image-gen/${sid}`, { replace: true });
      }
      return;
    }

    // 질문 필요 여부 판단
    const questions = await getClarifyQuestions(currentPrompt, childAgent);
    if (questions.length > 0) {
      setPendingQuestions(questions);
      setPendingPrompt(currentPrompt);
      setPhase("idle");
      return;
    }

    await executeGenerate(currentPrompt);
  };

  // ═══ 멀티턴 질문 완료 후 생성 ═══
  const handleClarifyComplete = async (answers: Record<string, string>) => {
    const enrichedPrompt = applyAnswers(pendingPrompt, answers);
    setPendingQuestions([]);
    setPendingPrompt("");
    await executeGenerate(enrichedPrompt);
  };

  const handleClarifySkip = async () => {
    const p = pendingPrompt;
    setPendingQuestions([]);
    setPendingPrompt("");
    await executeGenerate(p);
  };

  // ═══ 실제 이미지 생성 실행 ═══
  const executeGenerate = async (finalPrompt: string) => {
    if (!selectedChild || !childAgent) return;

    setError(null);
    setPhase("building");

    try {
      const built = buildImagePrompt(finalPrompt, childAgent, {
        hasReferenceImage: !!referenceImage,
      });

      setPhase("generating");

      const userId = user?.id ?? "local";

      let referenceImageUrl: string | undefined;
      if (referenceImage) {
        referenceImageUrl = await uploadImage(referenceImage.base64, userId);
      }

      const genResult = await generateAndUpload(built.prompt, userId, referenceImage?.base64);

      const image: GeneratedImage = {
        id: crypto.randomUUID(),
        childId: selectedChild.id,
        userId,
        imageUrl: genResult.imageUrl,
        prompt: finalPrompt,
        resolvedPrompt: built.prompt,
        style: built.style,
        backgroundLevel: built.backgroundLevel,
        complexity: built.complexity,
        feedback: null,
        referenceImageUrl,
        createdAt: new Date().toISOString(),
      };

      await addToHistory(image);
      await incrementGeneration(selectedChild.id);
      setCurrentImage(image);
      setHistory([image, ...history]);

      // assistant 메시지로 이미지 결과 + AI 텍스트 저장
      const aiText = genResult.text ?? `${finalPrompt}에 대한 이미지를 생성했어요.`;
      addAndSaveMessage("assistant", aiText, {
        type: "image",
        imageUrl: genResult.imageUrl,
        imageId: image.id,
        style: built.style,
        backgroundLevel: built.backgroundLevel,
        complexity: built.complexity,
        resolvedPrompt: built.prompt,
        referenceImageUrl,
      });

      setPrompt("");
      handleRemoveReference();
      setPhase("done");

      // 첫 생성 완료 → 세션 URL로 이동 (현재 URL에 sessionId가 없으면)
      const sid = sessionIdRef.current;
      if (sid && !window.location.pathname.includes(sid)) {
        navigate(`/image-gen/${sid}`, { replace: true });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "이미지 생성에 실패했어요";
      setError(errorMsg);
      addAndSaveMessage("assistant", errorMsg, { type: "error" });
      setPhase("error");

      // 에러 시에도 세션이 생성됐으면 URL 반영
      const sid = sessionIdRef.current;
      if (sid && !window.location.pathname.includes(sid)) {
        navigate(`/image-gen/${sid}`, { replace: true });
      }
    }
  };

  // ═══ 피드백 ═══
  const handleLike = async (msgImageId?: string) => {
    const imageId = msgImageId ?? currentImage?.id;
    if (!imageId || !selectedChild) return;

    if (currentImage?.id === imageId) {
      setCurrentImage({ ...currentImage, feedback: "liked" });
    }

    await updateFeedback(imageId, "liked");
    await recordLike(selectedChild.id);

    if (isRegenerateMode) {
      await confirmRegenerationSuccess(selectedChild.id);
      setIsRegenerateMode(false);
      setPreviousPrompt("");
    }
  };

  const handleDislike = async (msgImageId?: string) => {
    const imageId = msgImageId ?? currentImage?.id;
    if (!imageId || !selectedChild) return;

    if (currentImage?.id === imageId) {
      setCurrentImage({ ...currentImage, feedback: "disliked" });
    }

    await updateFeedback(imageId, "disliked");
    await recordDislike(selectedChild.id);

    setIsRegenerateMode(true);
    setPreviousPrompt(currentImage?.prompt ?? "");
    setPrompt("");
    inputRef.current?.focus();
  };

  // ═══ 자연어 수정 → 재생성 ═══
  const handleRegenerate = async () => {
    if (!prompt.trim() || !selectedChild || !childAgent) return;

    await recordRegeneration(selectedChild.id, previousPrompt, prompt.trim(), {
      additionalInstruction: prompt.trim(),
    });

    setIsRegenerateMode(false);
    setPreviousPrompt("");
    await handleGenerate();
  };

  // ═══ Enter 키 ═══
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (isRegenerateMode) handleRegenerate();
      else handleGenerate();
    }
  };

  const isGenerating = phase === "building" || phase === "generating" || phase === "uploading";
  const hasAssistantImage = messages.some(
    (m) => m.role === "assistant" && m.metadata?.type === "image",
  );

  return (
    <div className="flex h-[calc(100vh-57px)]">
      {/* ═══ 좌측: 아동 선택 ═══ */}
      <div className="w-56 shrink-0">
        <ChildSelector />
      </div>

      {/* ═══ 중앙: 대화 피드 + 입력 ═══ */}
      <div className="flex flex-1 flex-col">
        {/* 메시지 피드 */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto bg-white p-6">
          {!selectedChild ? (
            <div className="flex h-full items-center justify-center text-center">
              <div>
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50">
                  <ImagePlus className="h-7 w-7 text-violet-400" />
                </div>
                <p className="text-base font-semibold text-gray-700">아동을 선택해주세요</p>
                <p className="mt-2 text-sm text-gray-400">좌측에서 아동을 선택하면 agent가 자동으로 적용돼요</p>
              </div>
            </div>
          ) : messages.length === 0 && !isGenerating && pendingQuestions.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center">
              <div>
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50">
                  <ImagePlus className="h-7 w-7 text-violet-400" />
                </div>
                <p className="text-base font-semibold text-gray-700">만들고 싶은 이미지를 설명해주세요</p>
                <p className="mt-2 text-sm text-gray-400">예: 기쁜 표정의 아이, 사과와 바나나, 손 씻는 장면</p>
                {childAgent && (
                  <p className="mt-4 text-xs text-violet-500">
                    {selectedChild.name}의 agent가 스타일을 자동으로 맞춰줘요
                  </p>
                )}
              </div>
            </div>
          ) : messages.length === 0 && isGenerating ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-4 rounded-2xl border border-violet-100 bg-violet-50/60 px-10 py-8">
                <div className="h-10 w-10 animate-spin rounded-full border-3 border-violet-200 border-t-violet-600" />
                <div className="text-center">
                  <p className="text-sm font-semibold text-violet-700">
                    {phase === "building" ? "프롬프트 구성 중..." : "이미지 생성 중..."}
                  </p>
                  <p className="mt-1 text-xs text-violet-400">잠시만 기다려주세요</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-6 pb-4">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  childName={selectedChild?.name}
                  onLike={handleLike}
                  onDislike={handleDislike}
                />
              ))}

              {/* 질문 패널 */}
              {pendingQuestions.length > 0 && (
                <div className="mx-auto max-w-lg rounded-2xl border border-violet-100 bg-violet-50 p-5">
                  <p className="mb-4 text-center text-sm font-medium text-violet-700">
                    더 좋은 이미지를 위해 몇 가지만 알려주세요
                  </p>
                  <ClarifyPanel
                    questions={pendingQuestions}
                    onComplete={handleClarifyComplete}
                    onSkip={handleClarifySkip}
                  />
                </div>
              )}

              {/* 로딩 인디케이터 */}
              {isGenerating && !hasAssistantImage && (
                <div className="flex flex-col items-center py-10">
                  <div className="flex flex-col items-center gap-4 rounded-2xl border border-violet-100 bg-violet-50/60 px-10 py-8">
                    <div className="h-10 w-10 animate-spin rounded-full border-3 border-violet-200 border-t-violet-600" />
                    <div className="text-center">
                      <p className="text-sm font-semibold text-violet-700">
                        {phase === "building" ? "프롬프트 구성 중..." : "이미지 생성 중..."}
                      </p>
                      <p className="mt-1 text-xs text-violet-400">잠시만 기다려주세요</p>
                    </div>
                  </div>
                </div>
              )}
              {isGenerating && hasAssistantImage && (
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-violet-300 border-t-violet-600" />
                  </div>
                  <div className="rounded-2xl rounded-tl-md bg-gray-50 px-5 py-3">
                    <p className="text-sm font-medium text-gray-600">
                      {phase === "building" ? "프롬프트 구성 중..." : "이미지 생성 중..."}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">잠시만 기다려주세요</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && !messages.some((m) => m.metadata?.type === "error" && m.content === error) && (
            <div className="mx-auto mt-4 max-w-3xl rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}
        </div>

        {/* 하단: 입력창 */}
        <div className="border-t border-gray-200 bg-white px-6 py-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />

          {isRegenerateMode && (
            <div className="mb-3 flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2">
              <span className="text-xs text-amber-700">어떻게 바꾸면 좋을지 자유롭게 입력하세요</span>
              <button
                onClick={() => { setIsRegenerateMode(false); setPreviousPrompt(""); }}
                className="text-xs text-amber-400 hover:text-amber-600"
              >
                취소
              </button>
            </div>
          )}

          {referenceImage && (
            <div className="mb-2 flex items-center gap-2">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-gray-200">
                <img src={referenceImage.previewUrl} alt="참고 이미지" className="h-full w-full object-cover" />
                <button
                  onClick={handleRemoveReference}
                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gray-800 text-white hover:bg-gray-700"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <span className="text-xs text-gray-400">참고 이미지 첨부됨</span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={!selectedChild || isGenerating}
              className="shrink-0 rounded-xl border border-gray-200 p-3 text-gray-400 transition hover:border-violet-300 hover:text-violet-500 disabled:opacity-40"
              title="참고 이미지 첨부"
            >
              <ImagePlus className="h-5 w-5" />
            </button>
            <input
              ref={inputRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isRegenerateMode
                  ? "예: 더 단순하게, 배경 없애줘, 색 부드럽게, 크기 키워줘"
                  : selectedChild
                    ? `${selectedChild.name}에게 필요한 이미지를 설명하세요`
                    : "아동을 먼저 선택해주세요"
              }
              disabled={!selectedChild || isGenerating}
              className={`flex-1 rounded-xl border px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none disabled:opacity-50 ${
                isRegenerateMode
                  ? "border-amber-300 bg-amber-50 focus:border-amber-400"
                  : "border-gray-200 bg-gray-50 focus:border-violet-300"
              }`}
            />
            <button
              onClick={isRegenerateMode ? handleRegenerate : handleGenerate}
              disabled={!prompt.trim() || !selectedChild || isGenerating}
              className={`rounded-xl px-6 py-3 text-sm font-semibold text-white transition disabled:opacity-40 ${
                isRegenerateMode
                  ? "bg-amber-500 hover:bg-amber-600"
                  : "bg-violet-500 hover:bg-violet-600"
              }`}
            >
              {isGenerating ? "생성 중..." : isRegenerateMode ? "다시 생성" : "생성"}
            </button>
          </div>

          <p className="mt-2 text-center text-xs text-gray-300">
            AI가 생성한 이미지입니다. 사용 전 확인해주세요.
          </p>
        </div>
      </div>

      {/* ═══ 우측: Agent 카드 + 이력 ═══ */}
      <div className="w-64 shrink-0 overflow-y-auto border-l border-gray-200 bg-gray-50">
        {selectedChild && childAgent ? (
          <>
            <div className="p-3">
              <AgentCard agent={childAgent} childName={selectedChild.name} />
            </div>
            <div className="border-t border-gray-200">
              <ImageHistory />
            </div>
          </>
        ) : (
          <div className="px-4 py-8 text-center">
            <p className="text-xs text-gray-400">아동을 선택하면<br />Agent 정보가 표시돼요</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══ 메시지 버블 컴포넌트 ═══

function MessageBubble({
  message,
  childName,
  onLike,
  onDislike,
}: {
  message: ImageGenMessage;
  childName?: string;
  onLike: (imageId?: string) => void;
  onDislike: (imageId?: string) => void;
}) {
  // ── 유저 메시지 (우측) ──
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-lg rounded-2xl rounded-br-md bg-violet-500 px-5 py-3.5 shadow-sm">
          <p className="text-14-regular text-white">{message.content}</p>
          {message.metadata?.referenceImageUrl && message.metadata.referenceImageUrl !== "pending" && (
            <img
              src={message.metadata.referenceImageUrl}
              alt="참고"
              className="mt-3 h-20 w-20 rounded-xl border-2 border-white/30 object-cover"
            />
          )}
        </div>
      </div>
    );
  }

  // ── assistant 메시지 (좌측) ──
  const meta = message.metadata;

  // 에러
  if (meta?.type === "error") {
    return (
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs">
          ⚠️
        </div>
        <div className="max-w-lg rounded-2xl rounded-tl-md bg-red-50 px-5 py-3.5">
          <p className="text-sm text-red-600">{message.content}</p>
        </div>
      </div>
    );
  }

  // 프롬프트 텍스트 결과
  if (meta?.type === "prompt" && message.role === "assistant") {
    const handleCopy = () => {
      void navigator.clipboard.writeText(message.content);
    };
    return (
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-600">
          AI
        </div>
        <div className="min-w-0 max-w-lg">
          <div className="rounded-2xl rounded-tl-md border border-violet-200 bg-violet-50 px-5 py-4">
            <p className="mb-2 text-xs font-semibold text-violet-600">이미지 프롬프트</p>
            <p className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">{message.content}</p>
          </div>
          <div className="mt-2">
            <button
              onClick={handleCopy}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-600 shadow-sm transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-600"
            >
              복사하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 이미지 결과
  if (meta?.type === "image" && meta.imageUrl) {
    return (
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-600">
          AI
        </div>
        <div className="min-w-0 max-w-md">
          {/* AI 텍스트 응답 */}
          {message.content && (
            <div className="mb-3 rounded-2xl rounded-tl-md bg-gray-50 px-5 py-3.5">
              <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">{message.content}</p>
            </div>
          )}
          {/* 이미지 카드 */}
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 shadow-sm">
            <img
              src={meta.imageUrl}
              alt={message.content}
              className="max-h-80 w-full object-contain"
            />
          </div>
          {/* 피드백 */}
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => onLike(meta.imageId)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-600 shadow-sm transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-600"
            >
              👍 좋아요
            </button>
            <button
              onClick={() => onDislike(meta.imageId)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-600 shadow-sm transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-600"
            >
              수정할래요
            </button>
            <button
              onClick={async () => {
                try {
                  const res = await fetch(meta.imageUrl!);
                  const blob = await res.blob();
                  const blobUrl = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = blobUrl;
                  a.download = `${childName ?? "image"}_${Date.now()}.png`;
                  a.click();
                  URL.revokeObjectURL(blobUrl);
                } catch {
                  window.open(meta.imageUrl, "_blank");
                }
              }}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-600 shadow-sm transition hover:bg-gray-50"
            >
              다운로드
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 일반 텍스트
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-600">
        AI
      </div>
      <div className="max-w-lg rounded-2xl rounded-tl-md bg-gray-50 px-5 py-3.5">
        <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}
