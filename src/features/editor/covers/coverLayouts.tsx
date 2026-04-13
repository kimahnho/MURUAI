/**
 * 표지 레이아웃 5종 — 각 레이아웃의 SVG 장식과 제목 스타일을 정의.
 */
import type { CoverLayoutDef, CoverPalette } from "./coverTypes";

// ─── 코너 (corner) ───
// 2~4개 코너에 기하학적 장식 배치, 제목은 상단 중앙

const CornerDecorations = ({ palette }: { palette: CoverPalette }) => (
  <>
    {/* 좌상단 장식 */}
    <svg
      width="160" height="160" viewBox="0 0 160 160"
      style={{ position: "absolute", top: 16, left: 16 }}
    >
      <circle cx="50" cy="50" r="45" fill={palette.accent} opacity={0.35} />
      <circle cx="30" cy="90" r="25" fill={palette.accent} opacity={0.25} />
      <circle cx="95" cy="35" r="18" fill={palette.accent} opacity={0.45} />
      <circle cx="75" cy="80" r="12" fill={palette.titleBorder} opacity={0.5} />
    </svg>
    {/* 우하단 장식 */}
    <svg
      width="180" height="180" viewBox="0 0 180 180"
      style={{ position: "absolute", bottom: 16, right: 16 }}
    >
      <circle cx="130" cy="130" r="50" fill={palette.accent} opacity={0.3} />
      <circle cx="80" cy="140" r="30" fill={palette.accent} opacity={0.2} />
      <circle cx="150" cy="75" r="22" fill={palette.titleBorder} opacity={0.4} />
      <circle cx="110" cy="95" r="15" fill={palette.accent} opacity={0.4} />
    </svg>
    {/* 좌하단 작은 장식 */}
    <svg
      width="80" height="80" viewBox="0 0 80 80"
      style={{ position: "absolute", bottom: 40, left: 30 }}
    >
      <rect x="10" y="10" width="55" height="55" rx="16" fill={palette.accent} opacity={0.15} />
    </svg>
    {/* 우상단 작은 장식 */}
    <svg
      width="70" height="70" viewBox="0 0 70 70"
      style={{ position: "absolute", top: 50, right: 40 }}
    >
      <rect x="5" y="5" width="50" height="50" rx="25" fill={palette.titleBorder} opacity={0.3} />
    </svg>
    {/* 점선 장식 — 좌측 */}
    <svg
      width="3" height="200" viewBox="0 0 3 200"
      style={{ position: "absolute", top: "30%", left: 60 }}
    >
      {Array.from({ length: 20 }, (_, i) => (
        <circle key={i} cx="1.5" cy={i * 10 + 2} r="1.5" fill={palette.accent} opacity={0.3} />
      ))}
    </svg>
  </>
);

// ─── 풍경/장면 (scene) ───
// 하단에 언덕/풀밭, 상단에 구름과 해

const SceneDecorations = ({ palette }: { palette: CoverPalette }) => (
  <>
    {/* 구름 좌측 */}
    <svg
      width="120" height="60" viewBox="0 0 120 60"
      style={{ position: "absolute", top: "8%", left: "10%" }}
    >
      <ellipse cx="40" cy="35" rx="35" ry="20" fill="white" opacity={0.7} />
      <ellipse cx="65" cy="30" rx="28" ry="18" fill="white" opacity={0.7} />
      <ellipse cx="85" cy="38" rx="22" ry="15" fill="white" opacity={0.6} />
    </svg>
    {/* 구름 우측 */}
    <svg
      width="100" height="50" viewBox="0 0 100 50"
      style={{ position: "absolute", top: "5%", right: "15%" }}
    >
      <ellipse cx="35" cy="28" rx="28" ry="16" fill="white" opacity={0.6} />
      <ellipse cx="60" cy="25" rx="25" ry="14" fill="white" opacity={0.65} />
    </svg>
    {/* 해 */}
    <svg
      width="70" height="70" viewBox="0 0 70 70"
      style={{ position: "absolute", top: "3%", left: "50%", transform: "translateX(-50%)" }}
    >
      <circle cx="35" cy="35" r="25" fill={palette.accent} opacity={0.5} />
      <circle cx="35" cy="35" r="18" fill={palette.accent} opacity={0.3} />
    </svg>
    {/* 언덕 — 하단 풍경 */}
    <svg
      width="100%" height="40%" viewBox="0 0 800 400" preserveAspectRatio="none"
      style={{ position: "absolute", bottom: 0, left: 0 }}
    >
      <path
        d="M0 250 Q200 120 400 200 Q600 280 800 180 L800 400 L0 400 Z"
        fill={palette.accent}
        opacity={0.25}
      />
      <path
        d="M0 300 Q150 200 350 260 Q550 320 800 230 L800 400 L0 400 Z"
        fill={palette.accent}
        opacity={0.15}
      />
    </svg>
    {/* 작은 꽃/풀 디테일 */}
    <svg
      width="100%" height="60" viewBox="0 0 800 60"
      style={{ position: "absolute", bottom: "28%", left: 0 }}
    >
      {[80, 200, 350, 520, 680].map((x, i) => (
        <circle key={i} cx={x} cy={30 + (i % 2) * 12} r={4 + (i % 3)} fill={palette.accent} opacity={0.35} />
      ))}
    </svg>
  </>
);

// ─── 프레임/보더 (frame) ───
// 테두리를 따라 반복 장식 배치

const FrameDecorations = ({ palette }: { palette: CoverPalette }) => {
  const dotSize = 8;
  const gap = 28;
  const margin = 24;

  return (
    <>
      {/* 상단 보더 */}
      <svg
        width="100%" height="40" viewBox="0 0 800 40"
        style={{ position: "absolute", top: margin, left: 0 }}
      >
        {Array.from({ length: 28 }, (_, i) => (
          <circle key={`t${i}`} cx={margin + i * gap} cy="20" r={dotSize / 2} fill={palette.accent} opacity={0.4} />
        ))}
      </svg>
      {/* 하단 보더 */}
      <svg
        width="100%" height="40" viewBox="0 0 800 40"
        style={{ position: "absolute", bottom: margin, left: 0 }}
      >
        {Array.from({ length: 28 }, (_, i) => (
          <circle key={`b${i}`} cx={margin + i * gap} cy="20" r={dotSize / 2} fill={palette.accent} opacity={0.4} />
        ))}
      </svg>
      {/* 좌측 보더 */}
      <svg
        width="40" height="100%" viewBox="0 0 40 1130"
        style={{ position: "absolute", top: 0, left: margin }}
      >
        {Array.from({ length: 40 }, (_, i) => (
          <circle key={`l${i}`} cx="20" cy={margin + i * gap} r={dotSize / 2} fill={palette.accent} opacity={0.4} />
        ))}
      </svg>
      {/* 우측 보더 */}
      <svg
        width="40" height="100%" viewBox="0 0 40 1130"
        style={{ position: "absolute", top: 0, right: margin }}
      >
        {Array.from({ length: 40 }, (_, i) => (
          <circle key={`r${i}`} cx="20" cy={margin + i * gap} r={dotSize / 2} fill={palette.accent} opacity={0.4} />
        ))}
      </svg>
      {/* 코너 꽃 장식 */}
      {[
        { top: margin - 4, left: margin - 4 },
        { top: margin - 4, right: margin - 4 },
        { bottom: margin - 4, left: margin - 4 },
        { bottom: margin - 4, right: margin - 4 },
      ].map((pos, i) => (
        <svg
          key={`flower-${i}`}
          width="40" height="40" viewBox="0 0 40 40"
          style={{ position: "absolute", ...pos } as React.CSSProperties}
        >
          <circle cx="20" cy="12" r="8" fill={palette.accent} opacity={0.5} />
          <circle cx="12" cy="20" r="8" fill={palette.accent} opacity={0.5} />
          <circle cx="28" cy="20" r="8" fill={palette.accent} opacity={0.5} />
          <circle cx="20" cy="28" r="8" fill={palette.accent} opacity={0.5} />
          <circle cx="20" cy="20" r="6" fill={palette.titleBorder} opacity={0.7} />
        </svg>
      ))}
    </>
  );
};

// ─── 캐릭터 (character) ───
// 중앙~하단에 큰 캐릭터 일러스트

const CharacterDecorations = ({ palette }: { palette: CoverPalette }) => (
  <>
    {/* 메인 캐릭터 — 곰 형태 */}
    <svg
      width="240" height="260" viewBox="0 0 240 260"
      style={{ position: "absolute", bottom: "10%", left: "50%", transform: "translateX(-50%)" }}
    >
      {/* 몸통 */}
      <ellipse cx="120" cy="180" rx="75" ry="70" fill={palette.accent} opacity={0.35} />
      {/* 머리 */}
      <circle cx="120" cy="100" r="55" fill={palette.accent} opacity={0.4} />
      {/* 귀 */}
      <circle cx="75" cy="60" r="22" fill={palette.accent} opacity={0.45} />
      <circle cx="165" cy="60" r="22" fill={palette.accent} opacity={0.45} />
      <circle cx="75" cy="60" r="13" fill={palette.titleBorder} opacity={0.5} />
      <circle cx="165" cy="60" r="13" fill={palette.titleBorder} opacity={0.5} />
      {/* 눈 */}
      <circle cx="100" cy="95" r="7" fill={palette.bg} />
      <circle cx="140" cy="95" r="7" fill={palette.bg} />
      <circle cx="102" cy="93" r="3.5" fill="#555" />
      <circle cx="142" cy="93" r="3.5" fill="#555" />
      {/* 코 */}
      <ellipse cx="120" cy="112" rx="8" ry="6" fill={palette.titleBorder} opacity={0.7} />
      {/* 입 */}
      <path d="M112 118 Q120 126 128 118" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" />
      {/* 볼 */}
      <circle cx="88" cy="108" r="10" fill={palette.accent} opacity={0.25} />
      <circle cx="152" cy="108" r="10" fill={palette.accent} opacity={0.25} />
    </svg>
    {/* 작은 별 장식 */}
    {[
      { x: 60, y: 120 },
      { x: 680, y: 150 },
      { x: 100, y: 350 },
      { x: 650, y: 380 },
    ].map((pos, i) => (
      <svg
        key={`star-${i}`}
        width="16" height="16" viewBox="0 0 16 16"
        style={{ position: "absolute", top: pos.y, left: pos.x }}
      >
        <path
          d="M8 0 L10 6 L16 6 L11 10 L13 16 L8 12 L3 16 L5 10 L0 6 L6 6 Z"
          fill={palette.accent}
          opacity={0.35}
        />
      </svg>
    ))}
  </>
);

// ─── 미니멀/패턴 (minimal) ───
// 점/선/물결 등 미세 패턴, 장식 최소

const MinimalDecorations = ({ palette }: { palette: CoverPalette }) => (
  <>
    {/* 점 패턴 (배경 전체) */}
    <svg
      width="100%" height="100%" style={{ position: "absolute", inset: 0 }}
    >
      <defs>
        <pattern id="dot-pattern" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
          <circle cx="16" cy="16" r="2" fill={palette.accent} opacity={0.2} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dot-pattern)" />
    </svg>
    {/* 중앙 장식 라인 */}
    <svg
      width="200" height="4" viewBox="0 0 200 4"
      style={{ position: "absolute", top: "24%", left: "50%", transform: "translateX(-50%)" }}
    >
      <line x1="0" y1="2" x2="200" y2="2" stroke={palette.accent} strokeWidth="2" opacity={0.3} strokeDasharray="6 4" />
    </svg>
    <svg
      width="200" height="4" viewBox="0 0 200 4"
      style={{ position: "absolute", top: "36%", left: "50%", transform: "translateX(-50%)" }}
    >
      <line x1="0" y1="2" x2="200" y2="2" stroke={palette.accent} strokeWidth="2" opacity={0.3} strokeDasharray="6 4" />
    </svg>
  </>
);

// ─── 레이아웃 매핑 ───

const LAYOUT_RENDERERS: Record<string, (palette: CoverPalette) => React.ReactNode> = {
  corner: (p) => <CornerDecorations palette={p} />,
  scene: (p) => <SceneDecorations palette={p} />,
  frame: (p) => <FrameDecorations palette={p} />,
  character: (p) => <CharacterDecorations palette={p} />,
  minimal: (p) => <MinimalDecorations palette={p} />,
};

const TITLE_STYLES: Record<string, (palette: CoverPalette) => React.CSSProperties> = {
  corner: (p) => ({
    position: "absolute",
    top: "18%",
    left: "50%",
    transform: "translateX(-50%)",
    background: "white",
    border: `3px solid ${p.titleBorder}`,
    borderRadius: 16,
    padding: "16px 36px",
    minWidth: 180,
    maxWidth: "70%",
    textAlign: "center",
    zIndex: 2,
  }),
  scene: (p) => ({
    position: "absolute",
    top: "15%",
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(255,255,255,0.85)",
    border: `3px solid ${p.titleBorder}`,
    borderRadius: 20,
    padding: "18px 36px",
    minWidth: 180,
    maxWidth: "70%",
    textAlign: "center",
    zIndex: 2,
  }),
  frame: (p) => ({
    position: "absolute",
    top: "22%",
    left: "50%",
    transform: "translateX(-50%)",
    background: "white",
    border: `3px solid ${p.titleBorder}`,
    borderRadius: 14,
    padding: "16px 32px",
    minWidth: 180,
    maxWidth: "60%",
    textAlign: "center",
    zIndex: 2,
  }),
  character: (p) => ({
    position: "absolute",
    top: "12%",
    left: "50%",
    transform: "translateX(-50%)",
    background: "white",
    border: `3px solid ${p.titleBorder}`,
    borderRadius: 18,
    padding: "16px 36px",
    minWidth: 180,
    maxWidth: "70%",
    textAlign: "center",
    zIndex: 2,
  }),
  minimal: (p) => ({
    position: "absolute",
    top: "28%",
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(255,255,255,0.9)",
    border: `2px solid ${p.titleBorder}`,
    borderRadius: 12,
    padding: "20px 40px",
    minWidth: 200,
    maxWidth: "65%",
    textAlign: "center",
    zIndex: 2,
  }),
};

export const COVER_LAYOUTS: CoverLayoutDef[] = [
  {
    type: "corner",
    label: "코너",
    renderDecorations: (p) => LAYOUT_RENDERERS.corner(p),
    titleStyle: (p) => TITLE_STYLES.corner(p),
  },
  {
    type: "scene",
    label: "풍경",
    renderDecorations: (p) => LAYOUT_RENDERERS.scene(p),
    titleStyle: (p) => TITLE_STYLES.scene(p),
  },
  {
    type: "frame",
    label: "프레임",
    renderDecorations: (p) => LAYOUT_RENDERERS.frame(p),
    titleStyle: (p) => TITLE_STYLES.frame(p),
  },
  {
    type: "character",
    label: "캐릭터",
    renderDecorations: (p) => LAYOUT_RENDERERS.character(p),
    titleStyle: (p) => TITLE_STYLES.character(p),
  },
  {
    type: "minimal",
    label: "미니멀",
    renderDecorations: (p) => LAYOUT_RENDERERS.minimal(p),
    titleStyle: (p) => TITLE_STYLES.minimal(p),
  },
];
