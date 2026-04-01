/**
 * 특수교육용 이미지 소재 생성 — 메인 페이지
 *
 * 스타일 선택 UI 없음. Agent가 자동 적용.
 * 마음에 안 들면 자연어로 수정 ("더 단순하게", "배경 없애줘")
 */
import { useState, useRef } from "react";
import { useImageGenStore } from "../store/useImageGenStore";
import { ChildSelector } from "../components/ChildSelector";
import { AgentCard } from "../components/AgentCard";
import { ImageHistory } from "../components/ImageHistory";
import { ClarifyPanel } from "../components/ClarifyPanel";
import { buildImagePrompt } from "../ai/promptBuilder";
import { generateAndUpload } from "../ai/imageGenerator";
import { getClarifyQuestions, applyAnswers, type ClarifyQuestion } from "../ai/clarifyQuestions";
import { incrementGeneration, recordLike, recordDislike, recordRegeneration, confirmRegenerationSuccess } from "../ai/childAgent";
import { addToHistory, updateFeedback } from "../data/imageApi";
import type { GeneratedImage } from "../model/types";

export function ImageGenPage() {
  const {
    selectedChild, childAgent, phase, currentImage, error,
    setPhase, setCurrentImage, setError,
    history, setHistory,
  } = useImageGenStore();

  const [prompt, setPrompt] = useState("");
  const [isRegenerateMode, setIsRegenerateMode] = useState(false);
  const [previousPrompt, setPreviousPrompt] = useState("");
  const [pendingQuestions, setPendingQuestions] = useState<ClarifyQuestion[]>([]);
  const [pendingPrompt, setPendingPrompt] = useState(""); // 질문 대기 중인 원본 프롬프트
  const inputRef = useRef<HTMLInputElement>(null);

  // ═══ 생성 시작 — 즉시 로딩 표시 → 질문 필요 여부 판단 ═══
  const handleGenerate = async () => {
    if (!prompt.trim() || !selectedChild || !childAgent) return;

    const currentPrompt = prompt.trim();
    setPrompt("");
    setError(null);
    setPhase("building"); // 즉시 로딩 표시

    // Gemini가 질문 필요 여부 판단 (로딩 중에 병렬 실행)
    const questions = await getClarifyQuestions(currentPrompt, childAgent);
    if (questions.length > 0) {
      setPendingQuestions(questions);
      setPendingPrompt(currentPrompt);
      setPhase("idle"); // 질문 모드로 전환
      return;
    }

    // 질문 불필요 → 바로 생성 (이미 building phase)
    await executeGenerate(currentPrompt);
  };

  // ═══ 멀티턴 질문 완료 후 생성 ═══
  const handleClarifyComplete = async (answers: Record<string, string>) => {
    const enrichedPrompt = applyAnswers(pendingPrompt, answers);
    setPendingQuestions([]);
    setPendingPrompt("");
    await executeGenerate(enrichedPrompt);
  };

  // ═══ 질문 건너뛰기 → 원본 프롬프트로 바로 생성 ═══
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
      const built = buildImagePrompt(finalPrompt, childAgent);

      setPhase("generating");
      const imageUrl = await generateAndUpload(built.prompt, "local");

      const image: GeneratedImage = {
        id: `img_${Date.now()}`,
        childId: selectedChild.id,
        userId: "local",
        imageUrl,
        prompt: finalPrompt,
        resolvedPrompt: built.prompt,
        style: built.style,
        backgroundLevel: built.backgroundLevel,
        complexity: built.complexity,
        feedback: null,
        createdAt: new Date().toISOString(),
      };

      addToHistory(image);
      incrementGeneration(selectedChild.id);
      setCurrentImage(image);
      setHistory([image, ...history]);
      setPrompt("");
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "이미지 생성에 실패했어요");
      setPhase("error");
    }
  };

  // ═══ 좋아요 ═══
  const handleLike = () => {
    if (!currentImage || !selectedChild) return;
    updateFeedback(currentImage.id, "liked");
    setCurrentImage({ ...currentImage, feedback: "liked" });
    recordLike(selectedChild.id);

    if (isRegenerateMode) {
      confirmRegenerationSuccess(selectedChild.id);
      setIsRegenerateMode(false);
      setPreviousPrompt("");
    }
  };

  // ═══ 싫어요 → 자연어 수정 모드 진입 ═══
  const handleDislike = () => {
    if (!currentImage || !selectedChild) return;
    updateFeedback(currentImage.id, "disliked");
    setCurrentImage({ ...currentImage, feedback: "disliked" });
    recordDislike(selectedChild.id);

    setIsRegenerateMode(true);
    setPreviousPrompt(currentImage.prompt);
    setPrompt("");
    inputRef.current?.focus();
  };

  // ═══ 자연어 수정 → 재생성 (agent 학습) ═══
  const handleRegenerate = async () => {
    if (!prompt.trim() || !selectedChild || !childAgent) return;

    // agent에 수정 패턴 학습
    recordRegeneration(selectedChild.id, previousPrompt, prompt.trim(), {
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

  return (
    <div className="flex h-[calc(100vh-57px)]">
      {/* ═══ 좌측: 아동 선택 ═══ */}
      <div className="w-56 flex-shrink-0">
        <ChildSelector />
      </div>

      {/* ═══ 중앙: 프롬프트 + 이미지 ═══ */}
      <div className="flex flex-1 flex-col">
        {/* 이미지 표시 영역 */}
        <div className="flex flex-1 items-center justify-center bg-gray-50 p-8">
          {!selectedChild ? (
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-400">아동을 선택해주세요</p>
              <p className="mt-1 text-sm text-gray-300">좌측에서 아동을 선택하면 agent가 자동으로 적용돼요</p>
            </div>
          ) : pendingQuestions.length > 0 ? (
            <div className="w-full max-w-md">
              <p className="mb-3 text-center text-sm text-gray-500">
                더 좋은 이미지를 위해 몇 가지만 알려주세요
              </p>
              <ClarifyPanel
                questions={pendingQuestions}
                onComplete={handleClarifyComplete}
                onSkip={handleClarifySkip}
              />
            </div>
          ) : currentImage ? (
            <div className="flex flex-col items-center gap-4">
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <img
                  src={currentImage.imageUrl}
                  alt={currentImage.prompt}
                  className="max-h-[500px] max-w-[500px] object-contain"
                />
              </div>

              {/* 피드백 */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleLike}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                    currentImage.feedback === "liked"
                      ? "bg-violet-100 text-violet-700"
                      : "bg-gray-100 text-gray-600 hover:bg-violet-50"
                  }`}
                >
                  👍 좋아요
                </button>
                <button
                  onClick={handleDislike}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                    currentImage.feedback === "disliked"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-gray-100 text-gray-600 hover:bg-amber-50"
                  }`}
                >
                  수정할래요
                </button>
                <a
                  href={currentImage.imageUrl}
                  download={`${selectedChild.name}_${Date.now()}.png`}
                  className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200"
                >
                  다운로드
                </a>
              </div>
            </div>
          ) : isGenerating ? (
            <div className="text-center">
              <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-500" />
              <p className="text-sm font-medium text-gray-600">
                {phase === "building" ? "프롬프트 구성 중..." : "이미지 생성 중..."}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                {childAgent && `${childAgent.preferredStyle} 스타일 자동 적용`}
              </p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-400">
                만들고 싶은 이미지를 설명해주세요
              </p>
              <p className="mt-1 text-sm text-gray-300">
                예: 기쁜 표정의 아이, 사과와 바나나, 손 씻는 장면
              </p>
              {childAgent && (
                <p className="mt-3 text-xs text-violet-400">
                  {selectedChild?.name}의 agent가 스타일을 자동으로 맞춰줘요
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}
        </div>

        {/* 하단: 입력창 */}
        <div className="border-t border-gray-200 bg-white px-6 py-4">
          {/* 수정 모드 안내 */}
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

          <div className="flex items-center gap-3">
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
      <div className="w-64 flex-shrink-0 overflow-y-auto border-l border-gray-200 bg-gray-50">
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
