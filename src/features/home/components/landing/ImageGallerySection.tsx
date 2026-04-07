/**
 * 이미지 갤러리 섹션 — 6열 × 4행 이미지 24개 그리드.
 * 비로그인: 클릭 → 로그인 모달 / 로그인: 클릭 → 캔버스 에디터에 이미지 포함하여 이동.
 * 이미지 준비 전까지 플레이스홀더 표시.
 */
import { motion } from "framer-motion";

const GALLERY_IMAGES: string[] = [
  "https://res.cloudinary.com/dabbfycew/image/upload/v1775133760/muru-landing/010301_dog_realistic_illust.png",
  "https://res.cloudinary.com/dabbfycew/image/upload/v1775133762/muru-landing/010302_fox_colored_icon_260312_1928.png",
  "https://res.cloudinary.com/dabbfycew/image/upload/v1775133766/muru-landing/010302_squirrel_realistic_illust_260313_2247.png",
  "https://res.cloudinary.com/dabbfycew/image/upload/v1775133768/muru-landing/010302_tyrannosaurus_carnivore_realistic_illust.png",
  "https://res.cloudinary.com/dabbfycew/image/upload/v1775133772/muru-landing/010303_wild-goose_bird_3d_illust.png",
  "https://res.cloudinary.com/dabbfycew/image/upload/v1775133776/muru-landing/010304_blue-crab_hard-shell_realistic_illust.png",
  "https://res.cloudinary.com/dabbfycew/image/upload/v1775133778/muru-landing/010305_insect-collection_multiple-insects_colored_icon_260313_1013.png",
  "https://res.cloudinary.com/dabbfycew/image/upload/v1775133781/muru-landing/010402_forsythia_yellow_photorealistic.png",
  "https://res.cloudinary.com/dabbfycew/image/upload/v1775133783/muru-landing/010404_fish-tank_colored_icon_260311_1621.png",
  "https://res.cloudinary.com/dabbfycew/image/upload/v1775133785/muru-landing/010503_angel_realistic_illust_260402_1458_processed.png",
  "https://res.cloudinary.com/dabbfycew/image/upload/v1775133787/muru-landing/020102_fried-chicken_single-drumstick_photorealistic.png",
  "https://res.cloudinary.com/dabbfycew/image/upload/v1775133788/muru-landing/020102_gimbap_colored_icon.png",
  "https://res.cloudinary.com/dabbfycew/image/upload/v1775133792/muru-landing/020102_namul_realistic_illust_260313_1601.png",
  "https://res.cloudinary.com/dabbfycew/image/upload/v1775133794/muru-landing/020301_elementary-school-desk_realistic_illust.png",
  "https://res.cloudinary.com/dabbfycew/image/upload/v1775133796/muru-landing/020402_soap-bubbles_realistic_illust.png",
  "https://res.cloudinary.com/dabbfycew/image/upload/v1775133798/muru-landing/020404_snare-drum_red-with-drumsticks_watercolor-illust.png",
  "https://res.cloudinary.com/dabbfycew/image/upload/v1775133801/muru-landing/020405_radio_colored_icon_260315_2052_processed.png",
  "https://res.cloudinary.com/dabbfycew/image/upload/v1775133802/muru-landing/020601_high-speed-train_fast_colored_icon.png",
  "https://res.cloudinary.com/dabbfycew/image/upload/v1775133804/muru-landing/020701_korean-cash_realistic_illust_260315_1617.png",
  "https://res.cloudinary.com/dabbfycew/image/upload/v1775133806/muru-landing/030300_church_religious_colored_icon_260312_1353.png",
  "https://res.cloudinary.com/dabbfycew/image/upload/v1775133808/muru-landing/030400_subway-line-2_colored_icon_260316_1237.png",
  "https://res.cloudinary.com/dabbfycew/image/upload/v1775133812/muru-landing/040100_shadow_dark_simple_illust_2.png",
  "https://res.cloudinary.com/dabbfycew/image/upload/v1775133814/muru-landing/040100_spicy_eating-red-food-sticking-out-tongue-fanning-mouth-red-face-watery-eyes_realistic_illust_260402_2025_processed.png",
  "https://res.cloudinary.com/dabbfycew/image/upload/v1775133815/muru-landing/050401_waving-goodbye_waving-to-someone-leaving_realistic_illust_260402_1744_processed.png",
];

interface ImageGallerySectionProps {
  onImageClick: (imageUrl: string) => void;
}

const ImageGallerySection = ({ onImageClick }: ImageGallerySectionProps) => (
  <section className="flex w-full flex-col items-center px-4 py-14 md:px-10 md:py-20">
    <div className="flex w-full max-w-6xl flex-col items-center gap-8 md:gap-10">
      <motion.div
        initial={{ opacity: 0, y: 36 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
        className="grid w-full grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 md:gap-4"
      >
        {GALLERY_IMAGES.map((imageUrl, index) => (
          <button
            key={imageUrl}
            type="button"
            onClick={() => onImageClick(imageUrl)}
            className="group relative aspect-square overflow-hidden rounded-xl border border-black-25 bg-black-5 transition hover:border-primary-200 hover:shadow-[0_4px_16px_rgba(124,58,237,0.08)]"
          >
            <img
              src={imageUrl}
              alt={`이미지 ${index + 1}`}
              className="h-full w-full object-cover transition group-hover:scale-105"
              loading="lazy"
              draggable={false}
            />
          </button>
        ))}
      </motion.div>
    </div>
  </section>
);

export default ImageGallerySection;
