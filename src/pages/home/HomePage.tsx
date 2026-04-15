/**
 * 홈페이지 ("/") — 인증 여부와 관계없이 항상 랜딩 페이지 표시.
 * "바로 시작해보기" 클릭 시: 비인증 → 로그인 모달, 인증 → 빈 캔버스 이동.
 */
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { useAuthStore } from "@/shared/store/useAuthStore";
import { useModalStore } from "@/shared/store/useModalStore";
import { captureSentryError } from "@/shared/utils/sentryUtils";
import useToastStore from "@/shared/store/useToastStore";

import NewLandingPage from "@/features/home/components/landing/NewLandingPage";
import { useCreateDocumentNavigation } from "@/features/editor/hooks/useCreateDocumentNavigation";
import { withLogoCanvasElements } from "@/features/editor/utils/logoElement";
import type { Page } from "@/features/editor/model/pageTypes";

const PENDING_START_KEY = "pendingStartClick";

const HomePage = () => {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.role);
  const openAuthModal = useModalStore((s) => s.openAuthModal);
  const { createAndOpenDocument } = useCreateDocumentNavigation();
  const executingRef = useRef(false);

  // tester 유저는 /image-gen으로 리다이렉트
  useEffect(() => {
    if (isAuthenticated && role === "tester") {
      navigate("/image-gen", { replace: true });
    }
  }, [isAuthenticated, role, navigate]);

  // 비인증 → 로그인 완료 후 대기 중인 시작 버튼 자동 실행
  useEffect(() => {
    if (!isAuthenticated) return;
    const pendingStart = sessionStorage.getItem(PENDING_START_KEY);
    if (pendingStart) {
      sessionStorage.removeItem(PENDING_START_KEY);
      void openBlankDocument();
    }
  }, [isAuthenticated]);

  const openBlankDocument = async () => {
    if (executingRef.current) return;
    executingRef.current = true;
    try {
      const page: Page = {
        id: crypto.randomUUID(),
        pageNumber: 1,
        templateId: null,
        orientation: "vertical",
        elements: withLogoCanvasElements([]),
      };
      await createAndOpenDocument({ replace: false, pages: [page] });
    } catch (error) {
      captureSentryError(error, "랜딩 바로시작 캔버스 이동");
      useToastStore
        .getState()
        .showToast("문서를 생성하지 못했어요. 다시 시도해 주세요.");
    } finally {
      executingRef.current = false;
    }
  };

  const handleStartClick = () => {
    if (!isAuthenticated) {
      sessionStorage.setItem(PENDING_START_KEY, "1");
      openAuthModal();
      return;
    }
    void openBlankDocument();
  };

  return <NewLandingPage onStartClick={handleStartClick} />;
};

export default HomePage;
