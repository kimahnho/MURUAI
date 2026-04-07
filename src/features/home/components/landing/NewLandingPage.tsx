/**
 * 랜딩 페이지 — 히어로 + 이미지 갤러리 + 에디터 소개 + 선택 이유 + CTA.
 */
import HeroSection from "./HeroSection";
import ImageGallerySection from "./ImageGallerySection";
import EditorIntroSection from "./EditorIntroSection";
import ReasonsSection from "./ReasonsSection";
import CtaSection from "./CtaSection";

interface NewLandingPageProps {
  onImageClick: (imageUrl: string) => void;
  onStartClick: () => void;
}

const NewLandingPage = ({ onImageClick, onStartClick }: NewLandingPageProps) => (
  <>
    <HeroSection onStartClick={onStartClick} />
    <ImageGallerySection onImageClick={onImageClick} />
    <EditorIntroSection />
    <ReasonsSection />
    <CtaSection />
  </>
);

export default NewLandingPage;
