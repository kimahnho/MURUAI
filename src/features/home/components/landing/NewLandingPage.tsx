/**
 * 새 랜딩 페이지 — Snapdeck 스타일 프롬프트 입력 + 기능 소개.
 * 기존 LandingPage.tsx는 삭제하지 않고 보존.
 */
import AuthModal from "@/shared/ui/AuthModal";

import PromptHeroSection from "./PromptHeroSection";
import CapabilitySection from "./CapabilitySection";

interface NewLandingPageProps {
  onGenerate: (topic: string) => void;
  isGenerating: boolean;
}

const NewLandingPage = ({ onGenerate, isGenerating }: NewLandingPageProps) => (
  <>
    <PromptHeroSection onGenerate={onGenerate} isGenerating={isGenerating} />
    <CapabilitySection />
    <AuthModal />
  </>
);

export default NewLandingPage;
