/**
 * 홈페이지 ("/") — 인증 여부와 관계없이 항상 랜딩 페이지 표시.
 * 갤러리 이미지 클릭 시: 비인증 → 로그인 모달, 인증 → 캔버스에 이미지 포함 이동.
 */
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { useAuthStore } from "@/shared/store/useAuthStore";
import { useModalStore } from "@/shared/store/useModalStore";
import { mp } from "@/shared/utils/mixpanel";
import { captureSentryError } from "@/shared/utils/sentryUtils";
import useToastStore from "@/shared/store/useToastStore";

import NewLandingPage from "@/features/home/components/landing/NewLandingPage";
import { useCreateDocumentNavigation } from "@/features/editor/hooks/useCreateDocumentNavigation";
import { withLogoCanvasElements } from "@/features/editor/utils/logoElement";
import type { Page } from "@/features/editor/model/pageTypes";

const PENDING_IMAGE_KEY = "pendingLandingImage";

// 이미지 1장이 포함된 빈 문서 페이지를 생성한다.
const buildImagePage = (imageUrl: string): Page[] => {
  const pageId = crypto.randomUUID();
  const elementId = crypto.randomUUID();
  // A4 세로 기준 (210mm × 297mm, 1mm ≈ 3.7795px)
  const A4_W = 210 * 3.7795;
  const A4_H = 297 * 3.7795;
  const SIZE = 300;

  return [
    {
      id: pageId,
      pageNumber: 1,
      templateId: null,
      orientation: "vertical",
      elements: withLogoCanvasElements([
        {
          id: elementId,
          type: "rect",
          x: Math.round((A4_W - SIZE) / 2),
          y: Math.round((A4_H - SIZE) / 2),
          w: SIZE,
          h: SIZE,
          fill: `url(${imageUrl})`,
          imageBox: { x: 0, y: 0, w: SIZE, h: SIZE },
          isStandaloneImage: true,
        },
      ]),
    },
  ];
};

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

  // 비인증 → 로그인 완료 후 대기 중인 이미지 클릭 자동 실행
  useEffect(() => {
    if (!isAuthenticated) return;
    const pendingUrl = sessionStorage.getItem(PENDING_IMAGE_KEY);
    if (!pendingUrl) return;
    sessionStorage.removeItem(PENDING_IMAGE_KEY);
    void openDocumentWithImage(pendingUrl);
  }, [isAuthenticated]);

  const openDocumentWithImage = async (imageUrl: string) => {
    if (executingRef.current) return;
    executingRef.current = true;
    try {
      const pages = buildImagePage(imageUrl);
      await createAndOpenDocument({ replace: false, pages });
      mp.track("랜딩 이미지 클릭", { image_url: imageUrl });
    } catch (error) {
      captureSentryError(error, "랜딩 이미지 캔버스 이동");
      useToastStore
        .getState()
        .showToast("문서를 생성하지 못했어요. 다시 시도해 주세요.");
    } finally {
      executingRef.current = false;
    }
  };

  const handleImageClick = (imageUrl: string) => {
    if (!isAuthenticated) {
      sessionStorage.setItem(PENDING_IMAGE_KEY, imageUrl);
      openAuthModal();
      return;
    }
    void openDocumentWithImage(imageUrl);
  };

  return <NewLandingPage onImageClick={handleImageClick} />;
};

export default HomePage;
