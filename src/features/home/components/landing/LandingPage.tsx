/**
 * 랜딩 페이지 — 비인증 사용자에게 서비스를 소개하고 가입을 유도.
 */
import { useRef } from "react";

import AuthModal from "@/shared/ui/AuthModal";

import HeroSection from "./HeroSection";
import FeatureSection from "./FeatureSection";
import CtaSection from "./CtaSection";

const LandingPage = () => {
  const featureSectionRef = useRef<HTMLElement>(null);

  return (
    <>
      <HeroSection featureSectionRef={featureSectionRef} />
      <FeatureSection ref={featureSectionRef} />
      <CtaSection />
      <AuthModal />
    </>
  );
};

export default LandingPage;
