/**
 * 홈페이지 ("/") — 인증 여부와 관계없이 항상 랜딩 페이지 표시.
 * pages 레벨에서 features/editor와 features/home을 조합한다.
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { useAuthStore } from "@/shared/store/useAuthStore";
import { useModalStore } from "@/shared/store/useModalStore";
import { mp } from "@/shared/utils/mixpanel";
import { captureSentryError } from "@/shared/utils/sentryUtils";
import useToastStore from "@/shared/store/useToastStore";

import NewLandingPage from "@/features/home/components/landing/NewLandingPage";
import { useCreateDocumentNavigation } from "@/features/editor/hooks/useCreateDocumentNavigation";
import { generateEmotionStory } from "@/features/editor/ai/generateEmotionStory";
import { buildEmotionStoryPages } from "@/features/editor/utils/buildEmotionStoryPages";
import { fetchEmotionImageMap } from "@/features/editor/utils/fetchEmotionImageMap";

const PENDING_TOPIC_KEY = "pendingLandingTopic";
const PENDING_AI_LOG_KEY = "pendingAiLog";

const HomePage = () => {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.role);
  const openAuthModal = useModalStore((s) => s.openAuthModal);
  const { createAndOpenDocument } = useCreateDocumentNavigation();
  const [isGenerating, setIsGenerating] = useState(false);
  const executingRef = useRef(false);

  // tester 유저는 /studio로 리다이렉트
  useEffect(() => {
    if (isAuthenticated && role === "tester") {
      navigate("/studio", { replace: true });
    }
  }, [isAuthenticated, role, navigate]);

  // 비인증 → 로그인 완료 후 대기 중인 생성 자동 실행
  useEffect(() => {
    if (!isAuthenticated) return;
    const pending = sessionStorage.getItem(PENDING_TOPIC_KEY);
    if (!pending) return;
    sessionStorage.removeItem(PENDING_TOPIC_KEY);
    void executeGeneration(pending);
  }, [isAuthenticated]);

  // 텍스트 생성은 무료 — 크레딧 체크/차감 없음
  const executeGeneration = async (topic: string) => {
    if (executingRef.current) return;
    executingRef.current = true;
    setIsGenerating(true);
    try {
      const emotionImageMap = await fetchEmotionImageMap("photo-boy");
      const availableLabels = [...emotionImageMap.keys()];
      const stories = await generateEmotionStory(topic, availableLabels, 5);
      const pages = buildEmotionStoryPages(stories, emotionImageMap, undefined, { skipFixedPages: true });

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

      await createAndOpenDocument({ replace: false, pages });
      mp.track("[AI템플릿] 감정추론 텍스트 생성", { topic_length: topic.length });
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
    if (!isAuthenticated) {
      sessionStorage.setItem(PENDING_TOPIC_KEY, topic);
      openAuthModal();
      return;
    }
    void executeGeneration(topic);
  };

  return (
    <NewLandingPage
      onGenerate={handleGenerate}
      isGenerating={isGenerating}
    />
  );
};

export default HomePage;
