/**
 * 레거시 랜딩 페이지 — 보존용 (미사용).
 * NewLandingPage로 대체됨.
 */
import AuthModal from "@/shared/ui/AuthModal";

import HeroSection from "./HeroSection";
import FeatureSection from "./FeatureSection";
import CtaSection from "./CtaSection";

const LandingPage = () => (
  <>
    <HeroSection />
    <FeatureSection />
    <CtaSection />
    <AuthModal />
  </>
);

export default LandingPage;
