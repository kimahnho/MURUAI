/**
 * 랜딩 페이지 — 히어로 + 에스컬레이터 + 기능 소개 + 에디터 소개 + CTA.
 */
import HeroSection from "./HeroSection";
import ShowcaseMarqueeSection from "./ShowcaseMarqueeSection";
import ReasonsSection from "./ReasonsSection";
import EditorIntroSection from "./EditorIntroSection";
import CtaSection from "./CtaSection";

interface NewLandingPageProps {
  onStartClick: () => void;
}

const NewLandingPage = ({ onStartClick }: NewLandingPageProps) => (
  <>
    <HeroSection onStartClick={onStartClick} />
    <ShowcaseMarqueeSection />
    <ReasonsSection />
    <EditorIntroSection />
    <CtaSection />
  </>
);

export default NewLandingPage;
