/** 미니 프리뷰 렌더러 — A4 미리보기에서 각 컴포넌트를 축소 렌더링 */
import { useRef } from "react";

import type {
  HeaderInstructionConfig,
  ArrowTransformConfig,

  SelectionSentenceConfig,
  GridConfig,
  RewardTrackerConfig,
  ChecklistTableConfig,
  InfoGuideConfig,
  OutlineTitleConfig,
  WritingPracticeConfig,
  ColoringAreaConfig,
  CalendarConfig,
  MindMapConfig,
} from "../model/types";
import { computeDynamicSizes, MIND_MAP_CONTENT, MIND_MAP_THEMES } from "../utils/mindMapLayout";
import { NOTEBOOK_SPECS } from "../constants/defaults";
import "../styles/worksheet-preview.css";

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// --- Header Instruction ---
export const MiniHeader = ({ config }: { config: HeaderInstructionConfig }) => {
  const renderTitle = () => {
    let html = escapeHtml(config.title);
    config.title_highlights.forEach((h) => {
      const escaped = escapeHtml(h);
      html = html.replace(escaped, `<span class="ws-hl">${escaped}</span>`);
    });
    return html;
  };

  return (
    <div className="ws-header">
      <div className="ws-title" dangerouslySetInnerHTML={{ __html: renderTitle() }} />
      {config.instruction && <div className="ws-inst">{config.instruction}</div>}
      {config.rule_note && <div className="ws-rule">{config.rule_note}</div>}
    </div>
  );
};

// --- Arrow Transform ---
export const MiniArrowTransform = ({ config }: { config: ArrowTransformConfig }) => (
  <div className="ws-arrow-list">
    {config.pairs.map((p, i) => (
      <div key={i} className="ws-arrow-pair">
        <div className="ws-arrow-box ws-orig">{p.original}</div>
        <div className="ws-arrow-mid">&rarr;</div>
        <div className="ws-arrow-box ws-trans">{p.transformed}</div>
      </div>
    ))}
  </div>
);

// --- Selection Sentence ---
export const MiniSelectionSentence = ({ config }: { config: SelectionSentenceConfig }) => (
  <div>
    {config.sentences.map((s, i) => {
      const rendered = escapeHtml(s.template).replace(
        /\{([^}]+)\}/g,
        (_, ch: string) => `<span class="ws-ch">[ ${escapeHtml(ch).split("/").join(" / ")} ]</span>`,
      );
      return (
        <div key={i} className="ws-select-item">
          <span className="ws-select-num">{i + 1}.</span>
          <span dangerouslySetInnerHTML={{ __html: rendered }} />
        </div>
      );
    })}
    {config.show_answer_key && (
      <div className="ws-answer-key">
        정답:{" "}
        {config.sentences
          .map((s, i) => `${i + 1}.${(s.correct_answers || []).join(",")}`)
          .filter((a) => a.length > 2)
          .join(" | ")}
      </div>
    )}
  </div>
);

// --- Reward Tracker ---
export const MiniRewardTracker = ({ config }: { config: RewardTrackerConfig }) => (
  <div className="ws-reward">
    {config.label && <span className="ws-reward-label">{config.label}</span>}
    {Array.from({ length: config.slot_count || 5 }).map((_, i) => (
      <div key={i} className="ws-reward-slot">☆</div>
    ))}
  </div>
);

// --- Grid NxM ---
export const MiniGrid = ({ config }: { config: GridConfig }) => {
  const borderStyle: Record<string, string> = {
    rounded: "border-radius:4px;border:1px solid #e0e0e0;",
    square: "border-radius:0;border:1px solid #e0e0e0;",
    dashed: "border-radius:4px;border:1px dashed #ccc;",
    none: "",
  };
  const brd = borderStyle[config.cell_border] ?? borderStyle.rounded;
  const isImageMode = config.cell_content_type !== "text_only";

  return (
    <div className="ws-grid" style={{ gridTemplateColumns: `repeat(${config.cols || 3}, 1fr)` }}>
      {(config.items || []).map((it, i) => (
        <div key={i} className="ws-grid-cell" style={{ cssText: brd } as never}>
          {isImageMode && <div className="ws-cell-img">🖼</div>}
          <div className="ws-cell-txt">{it.text || ""}</div>
        </div>
      ))}
    </div>
  );
};

// --- Checklist Table ---
export const MiniChecklist = ({ config }: { config: ChecklistTableConfig }) => (
  <table className="ws-checklist">
    <thead>
      <tr>
        <th>No</th>
        <th>어휘</th>
        <th>어두</th>
        <th>어중</th>
        <th>메모</th>
      </tr>
    </thead>
    <tbody>
      {(config.rows || []).map((r, i) => (
        <tr key={i}>
          <td>{i + 1}</td>
          <td style={{ textAlign: "left" }}>{r.word}</td>
          <td><span className="ws-cb" /></td>
          <td><span className="ws-cb" /></td>
          <td />
        </tr>
      ))}
    </tbody>
  </table>
);

// --- Info Guide ---
export const MiniInfoGuide = ({ config }: { config: InfoGuideConfig }) => (
  <div className="ws-info-guide">
    {config.character_emoji && <div className="ws-info-char">{config.character_emoji}</div>}
    <div className="ws-info-blocks">
      {config.speech && (
        <div className="ws-info-bubble" dangerouslySetInnerHTML={{ __html: escapeHtml(config.speech).replace(/\n/g, "<br>") }} />
      )}
      {config.tip && <div className="ws-info-tip">{config.tip}</div>}
    </div>
  </div>
);

// --- Outline Title ---
export const MiniOutlineTitle = ({ config }: { config: OutlineTitleConfig }) => {
  const sk = config.outline_color || "#333";
  let extra = "";
  if (config.outline_style === "outline_shadow") extra = `text-shadow:2px 2px 0 ${sk}33;`;
  if (config.outline_style === "outline_double") extra = `-webkit-text-stroke:2px ${sk};`;

  return (
    <div className="ws-outline-title">
      <div
        className="ws-ot-text"
        style={{
          WebkitTextStrokeColor: sk,
          ...(extra ? { cssText: `-webkit-text-stroke-color:${sk};${extra}` } as never : {}),
        }}
      >
        {config.text}
      </div>
      {config.subtitle && <div className="ws-ot-sub">{config.subtitle}</div>}
    </div>
  );
};

// --- Writing Practice ---
export const MiniWritingPractice = ({ config }: { config: WritingPracticeConfig }) => {
  const nb = NOTEBOOK_SPECS[config.notebook_type || "8칸"] ?? NOTEBOOK_SPECS["8칸"];
  const chars: string[] = [];
  if (config.text) {
    for (const ch of config.text) {
      chars.push(ch === " " ? "" : ch);
    }
  }
  const rc = config.row_count || 2;
  const total = rc * nb.cols;

  return (
    <div>
      {config.show_model && config.text && <div className="ws-writing-model">{config.text}</div>}
      <div
        className="ws-writing-grid"
        style={{ gridTemplateColumns: `repeat(${nb.cols}, ${nb.cellSize})`, gridAutoRows: nb.cellSize }}
      >
        {Array.from({ length: total }).map((_, i) => {
          const ch = i < chars.length ? chars[i] : "";
          const isGuide = config.show_guide && ch;
          return (
            <div
              key={i}
              className={`ws-writing-cell ${isGuide ? "ws-guide" : "ws-blank"}`}
              style={{ fontSize: nb.fs }}
            >
              {isGuide ? ch : ""}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- Coloring Area ---
export const MiniColoringArea = ({ config }: { config: ColoringAreaConfig }) => {
  const p = Math.round((config.size_ratio || 0.6) * 100);
  return (
    <div className="ws-coloring" style={{ minHeight: `${p * 1.5}px` }}>
      <div className="ws-coloring-icon">🎨</div>
      <div>{config.image_description || "이미지 영역"}</div>
      <div style={{ fontSize: "4pt", color: "#ddd" }}>(라인아트 이미지)</div>
    </div>
  );
};

// --- Mind Map ---
const MIND_MAP_FONT_SIZE = { 0: 7, 1: 5.5, 2: 4.5 } as const;

interface MiniMindMapProps {
  config: MindMapConfig;
  onNodeMove?: (nodeId: string, x: number, y: number) => void;
}

export const MiniMindMap = ({ config, onNodeMove }: MiniMindMapProps) => {
  const { nodes } = config;
  const { w: contentW, h: contentH } = MIND_MAP_CONTENT;
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ nodeId: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  // 동적 노드 크기 (mm)
  const sizes = computeDynamicSizes(config.level1_count, config.level2_count_per_node);
  const diameterByLevel = { 0: sizes.d0, 1: sizes.d1, 2: sizes.d2 } as const;

  // 연결선: 부모→자식 중심 직선
  const connections = nodes
    .filter((n) => n.parent_id !== null)
    .map((n) => {
      const parent = nodes.find((p) => p.id === n.parent_id);
      if (!parent) return null;
      return { key: `${parent.id}-${n.id}`, x1: parent.position.x * contentW, y1: parent.position.y * contentH, x2: n.position.x * contentW, y2: n.position.y * contentH };
    })
    .filter(Boolean) as { key: string; x1: number; y1: number; x2: number; y2: number }[];

  // SVG 좌표 변환: 마우스 클라이언트 좌표 → SVG viewBox 좌표
  const clientToSvg = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const scaleX = contentW / rect.width;
    const scaleY = contentH / rect.height;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const handlePointerDown = (e: React.PointerEvent, nodeId: string) => {
    if (!onNodeMove) return;
    e.stopPropagation();
    e.preventDefault();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const svgPt = clientToSvg(e.clientX, e.clientY);
    dragRef.current = { nodeId, startX: svgPt.x, startY: svgPt.y, origX: node.position.x * contentW, origY: node.position.y * contentH };
    (e.target as SVGElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || !onNodeMove) return;
    const { nodeId, startX, startY, origX, origY } = dragRef.current;
    const svgPt = clientToSvg(e.clientX, e.clientY);
    const dx = svgPt.x - startX;
    const dy = svgPt.y - startY;
    // 경계 클램핑: 노드 반지름만큼 안쪽
    const node = nodes.find((n) => n.id === nodeId);
    const r = node ? diameterByLevel[node.level] / 2 : 10;
    const nx = Math.max(r, Math.min(contentW - r, origX + dx));
    const ny = Math.max(r, Math.min(contentH - r, origY + dy));
    onNodeMove(nodeId, nx / contentW, ny / contentH);
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  const theme = MIND_MAP_THEMES[config.color_theme ?? "gray"];
  const shape = config.node_shape ?? "circle";

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${contentW} ${contentH}`}
      style={{ width: "100%", height: "auto", display: "block" }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* 연결선 레이어 (뒤) */}
      <g>
        {connections.map((c) => (
          <line key={c.key} x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2} stroke={theme.line} strokeWidth={0.35} />
        ))}
      </g>
      {/* 노드 레이어 (앞) */}
      <g>
        {nodes.map((n) => {
          const cx = n.position.x * contentW;
          const cy = n.position.y * contentH;
          const r = diameterByLevel[n.level] / 2;
          const fs = MIND_MAP_FONT_SIZE[n.level];
          const fill = theme.fill[n.level];
          const stroke = theme.stroke[n.level];
          return (
            <g
              key={n.id}
              onPointerDown={(e) => handlePointerDown(e, n.id)}
              style={{ cursor: onNodeMove ? "grab" : "default" }}
            >
              {shape === "circle" ? (
                <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={0.35} />
              ) : (
                <rect
                  x={cx - r}
                  y={cy - r * 0.75}
                  width={r * 2}
                  height={r * 1.5}
                  rx={r * 0.3}
                  ry={r * 0.3}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={0.35}
                />
              )}
              {n.text && (
                <text
                  x={cx}
                  y={cy}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={fs}
                  fill={theme.text}
                  fontFamily="inherit"
                  style={{ pointerEvents: "none" }}
                >
                  {n.text}
                </text>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
};

// --- Calendar ---
const MINI_WEEKDAYS_SUN = ["일", "월", "화", "수", "목", "금", "토"];

export const MiniCalendar = ({ config }: { config: CalendarConfig }) => {
  const weekdays = config.start_day === "sunday" ? MINI_WEEKDAYS_SUN : ["월", "화", "수", "목", "금", "토", "일"];
  const firstDay = new Date(config.year, config.month - 1, 1).getDay();
  const daysInMonth = new Date(config.year, config.month, 0).getDate();
  const daysInPrevMonth = new Date(config.year, config.month - 1, 0).getDate();
  const offset = config.start_day === "sunday" ? firstDay : (firstDay + 6) % 7;

  if (config.mode === "weekly") {
    const weekOfMonth = config.week_of_month ?? 1;
    const weekStartDay = 1 + (weekOfMonth - 1) * 7 - offset;
    let title = `${config.month}월 ${weekOfMonth}주차`;
    if (config.title_format === "year_month") title = `${config.year}년 ${title}`;
    if (config.title_format === "custom" && config.custom_title) title = config.custom_title;
    return (
      <div style={{ fontSize: "4pt", lineHeight: 1.3 }}>
        <div style={{ textAlign: "center", fontWeight: "bold", fontSize: "5pt", marginBottom: 2 }}>{title}</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {weekdays.map((d) => (
                <th key={d} style={{ background: config.day_header_style.background, color: config.day_header_style.text_color, padding: "1px", fontSize: "3.5pt" }}>{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {Array.from({ length: 7 }, (_, i) => {
                const dateNum = weekStartDay + i;
                let txt: string;
                let clr = "#333";
                if (dateNum < 1) { txt = `${daysInPrevMonth + dateNum}`; clr = "#ccc"; }
                else if (dateNum > daysInMonth) { txt = `${dateNum - daysInMonth}`; clr = "#ccc"; }
                else { txt = `${dateNum}`; }
                return <td key={i} style={{ border: "0.3px solid #eee", padding: "1px", height: 12, verticalAlign: "top", color: clr }}>{txt}</td>;
              })}
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  // monthly
  let title = `${config.year}년 ${config.month}월`;
  if (config.title_format === "month_only") title = `${config.month}월`;
  if (config.title_format === "custom" && config.custom_title) title = config.custom_title;
  const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7;

  return (
    <div style={{ fontSize: "4pt", lineHeight: 1.3 }}>
      <div style={{ textAlign: "center", fontWeight: "bold", fontSize: "5pt", marginBottom: 2 }}>{title}</div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {weekdays.map((d) => (
              <th key={d} style={{ background: config.day_header_style.background, color: config.day_header_style.text_color, padding: "1px", fontSize: "3.5pt" }}>
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: totalCells / 7 }, (_, row) => (
            <tr key={row}>
              {Array.from({ length: 7 }, (_, col) => {
                const idx = row * 7 + col;
                const day = idx - offset + 1;
                const isOutOfRange = day < 1 || day > daysInMonth;
                let displayDay: number | string = "";
                if (day >= 1 && day <= daysInMonth) displayDay = day;
                else if (config.show_prev_next_month) displayDay = day < 1 ? daysInPrevMonth + day : day - daysInMonth;
                return (
                  <td key={col} style={{ border: "0.3px solid #eee", padding: "1px", height: 8, verticalAlign: "top", color: isOutOfRange ? "#ccc" : "#333" }}>
                    {displayDay}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
