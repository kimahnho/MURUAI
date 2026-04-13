/** 미니 프리뷰 렌더러 — A4 미리보기에서 각 컴포넌트를 축소 렌더링 */
import type {
  HeaderInstructionConfig,
  ArrowTransformConfig,
  SequentialRepeatConfig,
  SelectionSentenceConfig,
  GridConfig,
  RewardTrackerConfig,
  ChecklistTableConfig,
  InfoGuideConfig,
  OutlineTitleConfig,
  WritingPracticeConfig,
  ColoringAreaConfig,
  CalendarConfig,
  TimetableConfig,
} from "../model/types";
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

// --- Sequential Repeat ---
export const MiniSequentialRepeat = ({ config }: { config: SequentialRepeatConfig }) => (
  <div>
    {config.section_title && <div className="ws-seq-section-title">{config.section_title}</div>}
    {config.rows.map((r, i) => (
      <div key={i} className="ws-seq-row">
        {Array.from({ length: r.repeat || 5 }).map((_, j) => (
          <div key={j} className="ws-seq-syl">{r.syllable}</div>
        ))}
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

// --- Timetable ---
export const MiniTimetable = ({ config }: { config: TimetableConfig }) => (
  <div style={{ fontSize: "4pt", lineHeight: 1.3 }}>
    {config.title && (
      <div style={{ textAlign: "center", fontWeight: "bold", fontSize: "5pt", marginBottom: 2 }}>{config.title}</div>
    )}
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th style={{ background: config.column_header_style.background, color: config.column_header_style.text_color, padding: "1px", fontSize: "3.5pt" }} />
          {config.columns.map((col, i) => (
            <th key={i} style={{ background: config.column_header_style.background, color: config.column_header_style.text_color, padding: "1px", fontSize: "3.5pt" }}>
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {config.rows.map((row, ri) => (
          <tr key={ri}>
            <td style={{ background: row.is_separator ? config.separator_style.background : config.row_header_style.background, color: config.row_header_style.text_color, padding: "1px", fontWeight: "bold", fontSize: "3.5pt", whiteSpace: "nowrap" }}>
              {row.header}
            </td>
            {config.columns.map((_, ci) => (
              <td key={ci} style={{ border: "0.3px solid #eee", padding: "1px", height: row.is_separator ? 4 : 8, background: row.is_separator ? config.separator_style.background : undefined, textAlign: "center" }}>
                {config.cells[ri]?.[ci]?.text ?? ""}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
