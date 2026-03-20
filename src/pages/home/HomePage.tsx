/**
 * 홈페이지 ("/") — 인증 여부와 관계없이 항상 랜딩 페이지 표시.
 * pages 레벨에서 features/editor와 features/home을 조합한다.
 */
import { useState, useEffect, useRef } from "react";

import { useAuthStore } from "@/shared/store/useAuthStore";
import { useModalStore } from "@/shared/store/useModalStore";
import { mp } from "@/shared/utils/mixpanel";
import { captureSentryError } from "@/shared/utils/sentryUtils";
import useToastStore from "@/shared/store/useToastStore";
import BaseModal from "@/shared/ui/BaseModal";

import NewLandingPage from "@/features/home/components/landing/NewLandingPage";
import { useCreateDocumentNavigation } from "@/features/editor/hooks/useCreateDocumentNavigation";
import { generateEmotionStory } from "@/features/editor/ai/generateEmotionStory";
import { buildEmotionStoryPages } from "@/features/editor/utils/buildEmotionStoryPages";
import { fetchEmotionImageMap } from "@/features/editor/utils/fetchEmotionImageMap";
import {
  MONTHLY_AI_TEMPLATE_LIMIT,
  fetchMonthlyAiTemplateUsage,
  recordAiTemplateUsage,
} from "@/features/editor/utils/aiTemplateUsage";

const PENDING_TOPIC_KEY = "pendingLandingTopic";
const PENDING_AI_LOG_KEY = "pendingAiLog";

const HomePage = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const openAuthModal = useModalStore((s) => s.openAuthModal);
  const { createAndOpenDocument } = useCreateDocumentNavigation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isQuotaExhausted, setIsQuotaExhausted] = useState(false);
  const [isQuotaModalOpen, setIsQuotaModalOpen] = useState(false);
  const executingRef = useRef(false);

  // 인증 시 사용량 조회
  useEffect(() => {
    if (!isAuthenticated) return;
    void fetchMonthlyAiTemplateUsage().then((used) => {
      setIsQuotaExhausted(used >= MONTHLY_AI_TEMPLATE_LIMIT);
    });
  }, [isAuthenticated]);

  // 비인증 → 로그인 완료 후 대기 중인 생성 자동 실행
  useEffect(() => {
    if (!isAuthenticated) return;
    const pending = sessionStorage.getItem(PENDING_TOPIC_KEY);
    if (!pending) return;
    sessionStorage.removeItem(PENDING_TOPIC_KEY);
    void executeGeneration(pending);
  }, [isAuthenticated]);

  const executeGeneration = async (topic: string) => {
    if (executingRef.current) return;
    executingRef.current = true;
    setIsGenerating(true);
    try {
      // 월간 사용량 체크
      const currentUsage = await fetchMonthlyAiTemplateUsage();
      if (currentUsage >= MONTHLY_AI_TEMPLATE_LIMIT) {
        setIsQuotaExhausted(true);
        setIsQuotaModalOpen(true);
        return;
      }

      const emotionImageMap = await fetchEmotionImageMap("photo-boy");
      const availableLabels = [...emotionImageMap.keys()];
      const stories = await generateEmotionStory(topic, availableLabels);
      const pages = buildEmotionStoryPages(stories, emotionImageMap);

      // 로그 데이터를 sessionStorage에 저장 — 에디터 진입 후 DB 기록 + 배너 등록
      const initialTexts = stories.map((s) => ({
        title: s.title,
        sentence: s.sentence,
      }));
      const storyPageIds = pages.slice(-stories.length).map((p) => p.id);
      sessionStorage.setItem(
        PENDING_AI_LOG_KEY,
        JSON.stringify({
          type: "emotion",
          topic,
          stories,
          initialTexts,
          storyPageIds,
          source: "landing",
        }),
      );

      // 사용량 기록
      void recordAiTemplateUsage("emotion");

      await createAndOpenDocument({ replace: false, pages });
      mp.track("랜딩 AI 감정추론 생성", { topic_length: topic.length });
    } catch (error) {
      captureSentryError(error, "랜딩 AI 감정추론 생성");
      useToastStore
        .getState()
        .showToast("스토리 생성에 실패했어요. 다시 시도해 주세요.");
    } finally {
      setIsGenerating(false);
      executingRef.current = false;
    }
  };

  const handleGenerate = (topic: string) => {
    if (isQuotaExhausted) {
      setIsQuotaModalOpen(true);
      return;
    }
    if (!isAuthenticated) {
      sessionStorage.setItem(PENDING_TOPIC_KEY, topic);
      openAuthModal();
      return;
    }
    void executeGeneration(topic);
  };

  return (
    <>
      <NewLandingPage
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
        isQuotaExhausted={isQuotaExhausted}
      />
      <BaseModal
        isOpen={isQuotaModalOpen}
        onClose={() => setIsQuotaModalOpen(false)}
        title="무료 이용 횟수 소진"
        size="sm"
      >
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <p className="text-16-regular text-black-70">
            이번 달 무료 이용 횟수를 모두 사용했어요.
            <br />
            다음 달에 다시 이용해 주세요.
          </p>
          <button
            type="button"
            onClick={() => setIsQuotaModalOpen(false)}
            className="rounded-xl bg-[#8C6D46] px-6 py-2.5 text-14-semibold text-white-100 transition hover:bg-[#7A5D3A] cursor-pointer"
          >
            확인
          </button>
        </div>
      </BaseModal>
    </>
  );
};

export default HomePage;
