/**
 * 쇼케이스 에스컬레이터 섹션 — 학습자료 스크린샷을 1줄 무한 자동 스크롤로 표시.
 * public/showcase/ 폴더의 이미지를 사용한다.
 */

const SHOWCASE_IMAGES: string[] = [
  "/showcase/sample-01.webp",
  "/showcase/sample-02.webp",
  "/showcase/sample-08.webp",
  "/showcase/sample-04.webp",
  "/showcase/sample-05.webp",
  "/showcase/sample-06.webp",
  "/showcase/sample-07.webp",
];

const ShowcaseMarqueeSection = () => {
  const repeated = [...SHOWCASE_IMAGES, ...SHOWCASE_IMAGES, ...SHOWCASE_IMAGES];

  return (
    <section className="relative w-full overflow-hidden py-4 md:py-8">
      {/* 좌우 페이드 */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-white to-transparent md:w-32" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-white to-transparent md:w-32" />

      <div
        className="flex gap-4 md:gap-5"
        style={{
          animation: "marquee-left 50s linear infinite",
          width: "max-content",
        }}
      >
        {repeated.map((src, i) => (
          <div
            key={`${src}-${i}`}
            className="shrink-0 overflow-hidden rounded-2xl bg-white shadow-[0_2px_20px_rgba(0,0,0,0.08)]"
          >
            <img
              src={src}
              alt=""
              className="h-56 w-auto md:h-72 lg:h-80"
              loading="lazy"
              draggable={false}
            />
          </div>
        ))}
      </div>
    </section>
  );
};

export default ShowcaseMarqueeSection;
