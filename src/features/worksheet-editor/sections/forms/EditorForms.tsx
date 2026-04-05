/** 컴포넌트별 속성 편집 폼 */
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
} from "../../model/types";
import { NOTEBOOK_SPECS } from "../../constants/defaults";

// 공용 스타일 상수
const labelCls = "block text-[10.5px] font-semibold text-black-55 uppercase tracking-wider mb-1";
const inputCls =
  "w-full px-3 py-2 border-[1.5px] border-black-25 rounded-lg font-inherit text-[13px] focus:outline-none focus:border-primary";
const textareaCls = `${inputCls} min-h-14 resize-y`;
const itemRowCls = "flex items-center gap-1.5 p-2 bg-black-5 rounded-lg mb-1.5";
const removeBtnCls =
  "w-6.5 h-6.5 rounded-md border-none bg-error-50 text-error-700 cursor-pointer text-[13px] flex items-center justify-center shrink-0";
const addBtnCls =
  "w-full py-2 rounded-lg border-[1.5px] border-dashed border-black-40 bg-transparent text-black-55 font-inherit text-xs cursor-pointer hover:border-primary hover:text-primary hover:bg-primary-50 transition";
const chipGroupCls = "flex gap-1.5 flex-wrap";

const Chip = ({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-3 py-1.5 rounded-full text-xs border-[1.5px] cursor-pointer font-inherit transition ${
      isActive
        ? "border-primary bg-primary-50 text-primary font-semibold"
        : "border-black-25 bg-white-100 hover:border-primary"
    }`}
  >
    {label}
  </button>
);

interface FormProps<T> {
  config: T;
  onUpdate: (updater: (prev: T) => T) => void;
}

// --- Header Instruction ---
export const HeaderInstructionForm = ({ config, onUpdate }: FormProps<HeaderInstructionConfig>) => (
  <>
    <div className="mb-3">
      <label className={labelCls}>제목</label>
      <input
        type="text"
        className={inputCls}
        value={config.title}
        onChange={(e) => onUpdate((c) => ({ ...c, title: e.target.value }))}
      />
    </div>
    <div className="mb-3">
      <label className={labelCls}>지시문</label>
      <input
        type="text"
        className={inputCls}
        value={config.instruction || ""}
        onChange={(e) => onUpdate((c) => ({ ...c, instruction: e.target.value }))}
        placeholder="활동 안내 (선택)"
      />
    </div>
    <div>
      <label className={labelCls}>음운 규칙 메모</label>
      <input
        type="text"
        className={inputCls}
        value={config.rule_note || ""}
        onChange={(e) => onUpdate((c) => ({ ...c, rule_note: e.target.value }))}
        placeholder="선택"
      />
    </div>
  </>
);

// --- Arrow Transform ---
export const ArrowTransformForm = ({ config, onUpdate }: FormProps<ArrowTransformConfig>) => (
  <div>
    <label className={labelCls}>변환 쌍</label>
    {config.pairs.map((p, j) => (
      <div key={j} className={itemRowCls}>
        <input
          type="text"
          className={`${inputCls} flex-1`}
          value={p.original}
          placeholder="원래"
          onChange={(e) =>
            onUpdate((c) => ({
              ...c,
              pairs: c.pairs.map((pp, i) => (i === j ? { ...pp, original: e.target.value } : pp)),
            }))
          }
        />
        <span className="text-black-40">&rarr;</span>
        <input
          type="text"
          className={`${inputCls} flex-1`}
          value={p.transformed}
          placeholder="변환"
          onChange={(e) =>
            onUpdate((c) => ({
              ...c,
              pairs: c.pairs.map((pp, i) => (i === j ? { ...pp, transformed: e.target.value } : pp)),
            }))
          }
        />
        <button
          type="button"
          className={removeBtnCls}
          onClick={() => onUpdate((c) => ({ ...c, pairs: c.pairs.filter((_, i) => i !== j) }))}
        >
          ✕
        </button>
      </div>
    ))}
    <button
      type="button"
      className={addBtnCls}
      onClick={() => onUpdate((c) => ({ ...c, pairs: [...c.pairs, { original: "", transformed: "" }] }))}
    >
      + 변환 쌍 추가
    </button>
  </div>
);

// --- Sequential Repeat ---
export const SequentialRepeatForm = ({ config, onUpdate }: FormProps<SequentialRepeatConfig>) => (
  <>
    <div className="mb-3">
      <label className={labelCls}>섹션 제목</label>
      <input
        type="text"
        className={inputCls}
        value={config.section_title || ""}
        onChange={(e) => onUpdate((c) => ({ ...c, section_title: e.target.value }))}
      />
    </div>
    <div>
      <label className={labelCls}>반복 음절</label>
      {config.rows.map((r, j) => (
        <div key={j} className={itemRowCls}>
          <input
            type="text"
            className={`${inputCls} flex-1`}
            value={r.syllable}
            placeholder="음절"
            onChange={(e) =>
              onUpdate((c) => ({
                ...c,
                rows: c.rows.map((rr, i) => (i === j ? { ...rr, syllable: e.target.value } : rr)),
              }))
            }
          />
          <input
            type="number"
            className={`${inputCls} w-14`}
            value={r.repeat}
            min={3}
            max={10}
            onChange={(e) =>
              onUpdate((c) => ({
                ...c,
                rows: c.rows.map((rr, i) =>
                  i === j ? { ...rr, repeat: parseInt(e.target.value) || 5 } : rr,
                ),
              }))
            }
          />
          <button
            type="button"
            className={removeBtnCls}
            onClick={() => onUpdate((c) => ({ ...c, rows: c.rows.filter((_, i) => i !== j) }))}
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        className={addBtnCls}
        onClick={() =>
          onUpdate((c) => ({ ...c, rows: [...c.rows, { syllable: "", repeat: 5 }] }))
        }
      >
        + 음절 추가
      </button>
    </div>
  </>
);

// --- Selection Sentence ---
export const SelectionSentenceForm = ({ config, onUpdate }: FormProps<SelectionSentenceConfig>) => (
  <>
    <div className="mb-3">
      <label className={labelCls}>문장 ({"{A/B}"} 형식)</label>
      {config.sentences.map((s, j) => (
        <div key={j} className={itemRowCls}>
          <input
            type="text"
            className={`${inputCls} flex-1`}
            value={s.template}
            placeholder="문장 {옵션A/옵션B}"
            onChange={(e) =>
              onUpdate((c) => ({
                ...c,
                sentences: c.sentences.map((ss, i) =>
                  i === j ? { ...ss, template: e.target.value } : ss,
                ),
              }))
            }
          />
          <button
            type="button"
            className={removeBtnCls}
            onClick={() =>
              onUpdate((c) => ({ ...c, sentences: c.sentences.filter((_, i) => i !== j) }))
            }
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        className={addBtnCls}
        onClick={() =>
          onUpdate((c) => ({
            ...c,
            sentences: [...c.sentences, { template: "", correct_answers: [] }],
          }))
        }
      >
        + 문장 추가
      </button>
    </div>
    <div className="mb-3">
      <label className="flex items-center gap-1.5 cursor-pointer text-xs text-black-70">
        <input
          type="checkbox"
          checked={config.show_answer_key}
          onChange={(e) => onUpdate((c) => ({ ...c, show_answer_key: e.target.checked }))}
        />
        정답지 표시
      </label>
    </div>
    {config.show_answer_key && (
      <div>
        <label className={labelCls}>정답 입력</label>
        {config.sentences.map((s, j) => (
          <div key={j} className={itemRowCls}>
            <span className="text-black-40 text-[10px] shrink-0">{j + 1}번</span>
            <input
              type="text"
              className={`${inputCls} flex-1`}
              value={(s.correct_answers || []).join(", ")}
              placeholder="쉼표로 구분 (예: 발, 발)"
              onChange={(e) =>
                onUpdate((c) => ({
                  ...c,
                  sentences: c.sentences.map((ss, i) =>
                    i === j
                      ? {
                          ...ss,
                          correct_answers: e.target.value
                            .split(",")
                            .map((v) => v.trim())
                            .filter(Boolean),
                        }
                      : ss,
                  ),
                }))
              }
            />
          </div>
        ))}
      </div>
    )}
  </>
);

// --- Grid ---
export const GridForm = ({ config, onUpdate }: FormProps<GridConfig>) => {
  const handleResize = (key: "rows" | "cols", value: number) => {
    onUpdate((c) => {
      const updated = { ...c, [key]: value };
      const target = updated.rows * updated.cols;
      const items = [...updated.items];
      while (items.length < target) items.push({ text: "", text_highlight: "" });
      if (items.length > target) items.length = target;
      return { ...updated, items };
    });
  };

  return (
    <>
      <div className="flex gap-2 mb-3">
        <div className="flex-1">
          <label className={labelCls}>행</label>
          <input
            type="number"
            className={inputCls}
            value={config.rows}
            min={1}
            max={6}
            onChange={(e) => handleResize("rows", parseInt(e.target.value) || 2)}
          />
        </div>
        <div className="flex-1">
          <label className={labelCls}>열</label>
          <input
            type="number"
            className={inputCls}
            value={config.cols}
            min={1}
            max={6}
            onChange={(e) => handleResize("cols", parseInt(e.target.value) || 3)}
          />
        </div>
      </div>
      <div className="mb-3">
        <label className={labelCls}>셀 유형</label>
        <div className={chipGroupCls}>
          <Chip
            label="텍스트만"
            isActive={config.cell_content_type === "text_only"}
            onClick={() => onUpdate((c) => ({ ...c, cell_content_type: "text_only" }))}
          />
          <Chip
            label="이미지+텍스트"
            isActive={config.cell_content_type === "image_and_text"}
            onClick={() => onUpdate((c) => ({ ...c, cell_content_type: "image_and_text" }))}
          />
        </div>
      </div>
      <div className="mb-3">
        <label className={labelCls}>테두리</label>
        <div className={chipGroupCls}>
          {(["rounded", "square", "dashed", "none"] as const).map((s) => (
            <Chip
              key={s}
              label={{ rounded: "둥근", square: "직각", dashed: "점선", none: "없음" }[s]}
              isActive={config.cell_border === s}
              onClick={() => onUpdate((c) => ({ ...c, cell_border: s }))}
            />
          ))}
        </div>
      </div>
      <div>
        <label className={labelCls}>셀 내용</label>
        {config.items.map((it, j) => (
          <div key={j} className={itemRowCls}>
            <span className="text-black-40 text-[11px] w-4.5">{j + 1}</span>
            <input
              type="text"
              className={`${inputCls} flex-1`}
              value={it.text || ""}
              placeholder="텍스트"
              onChange={(e) =>
                onUpdate((c) => ({
                  ...c,
                  items: c.items.map((ii, i) => (i === j ? { ...ii, text: e.target.value } : ii)),
                }))
              }
            />
            <button
              type="button"
              className={removeBtnCls}
              onClick={() =>
                onUpdate((c) => ({ ...c, items: c.items.filter((_, i) => i !== j) }))
              }
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          className={addBtnCls}
          onClick={() =>
            onUpdate((c) => ({
              ...c,
              items: [...c.items, { text: "", text_highlight: "" }],
            }))
          }
        >
          + 셀 추가
        </button>
      </div>
    </>
  );
};

// --- Reward Tracker ---
export const RewardTrackerForm = ({ config, onUpdate }: FormProps<RewardTrackerConfig>) => (
  <div className="flex gap-2">
    <div className="flex-1">
      <label className={labelCls}>칸 수</label>
      <input
        type="number"
        className={inputCls}
        value={config.slot_count}
        min={3}
        max={10}
        onChange={(e) =>
          onUpdate((c) => ({ ...c, slot_count: parseInt(e.target.value) || 5 }))
        }
      />
    </div>
    <div className="flex-1">
      <label className={labelCls}>라벨</label>
      <input
        type="text"
        className={inputCls}
        value={config.label || ""}
        onChange={(e) => onUpdate((c) => ({ ...c, label: e.target.value }))}
      />
    </div>
  </div>
);

// --- Checklist Table ---
export const ChecklistTableForm = ({ config, onUpdate }: FormProps<ChecklistTableConfig>) => (
  <div>
    <label className={labelCls}>어휘 목록</label>
    {config.rows.map((r, j) => (
      <div key={j} className={itemRowCls}>
        <span className="text-black-40 text-[11px] w-4.5">{j + 1}</span>
        <input
          type="text"
          className={`${inputCls} flex-1`}
          value={r.word}
          onChange={(e) =>
            onUpdate((c) => ({
              ...c,
              rows: c.rows.map((rr, i) => (i === j ? { word: e.target.value } : rr)),
            }))
          }
        />
        <button
          type="button"
          className={removeBtnCls}
          onClick={() => onUpdate((c) => ({ ...c, rows: c.rows.filter((_, i) => i !== j) }))}
        >
          ✕
        </button>
      </div>
    ))}
    <button
      type="button"
      className={addBtnCls}
      onClick={() => onUpdate((c) => ({ ...c, rows: [...c.rows, { word: "" }] }))}
    >
      + 어휘 추가
    </button>
  </div>
);

// --- Info Guide ---
export const InfoGuideForm = ({ config, onUpdate }: FormProps<InfoGuideConfig>) => (
  <>
    <div className="mb-3">
      <label className={labelCls}>캐릭터 이모지</label>
      <input
        type="text"
        className={`${inputCls} w-15`}
        value={config.character_emoji}
        onChange={(e) => onUpdate((c) => ({ ...c, character_emoji: e.target.value }))}
      />
    </div>
    <div className="mb-3">
      <label className={labelCls}>안내 말풍선</label>
      <textarea
        className={textareaCls}
        value={config.speech}
        onChange={(e) => onUpdate((c) => ({ ...c, speech: e.target.value }))}
      />
    </div>
    <div>
      <label className={labelCls}>팁 박스</label>
      <textarea
        className={textareaCls}
        value={config.tip}
        onChange={(e) => onUpdate((c) => ({ ...c, tip: e.target.value }))}
      />
    </div>
  </>
);

// --- Outline Title ---
export const OutlineTitleForm = ({ config, onUpdate }: FormProps<OutlineTitleConfig>) => (
  <>
    <div className="mb-3">
      <label className={labelCls}>주제 텍스트</label>
      <input
        type="text"
        className={inputCls}
        value={config.text}
        onChange={(e) => onUpdate((c) => ({ ...c, text: e.target.value }))}
      />
    </div>
    <div className="mb-3">
      <label className={labelCls}>외곽선 색상</label>
      <input
        type="text"
        className={`${inputCls} w-25`}
        value={config.outline_color}
        onChange={(e) => onUpdate((c) => ({ ...c, outline_color: e.target.value }))}
        placeholder="#333333"
      />
      <div className="text-[10px] text-black-45 mt-1">내부 흰색 + 외곽선 색상</div>
    </div>
    <div>
      <label className={labelCls}>지시문 (선택)</label>
      <input
        type="text"
        className={inputCls}
        value={config.subtitle || ""}
        onChange={(e) => onUpdate((c) => ({ ...c, subtitle: e.target.value }))}
      />
    </div>
  </>
);

// --- Writing Practice ---
export const WritingPracticeForm = ({ config, onUpdate }: FormProps<WritingPracticeConfig>) => {
  const spec = NOTEBOOK_SPECS[config.notebook_type || "8칸"] ?? NOTEBOOK_SPECS["8칸"];

  return (
    <>
      <div className="flex gap-2 mb-3">
        <div className="flex-1">
          <label className={labelCls}>칸 선택</label>
          <div className={chipGroupCls}>
            {(["5칸", "8칸", "10칸"] as const).map((s) => (
              <Chip
                key={s}
                label={`${s} 노트`}
                isActive={config.notebook_type === s}
                onClick={() => onUpdate((c) => ({ ...c, notebook_type: s }))}
              />
            ))}
          </div>
          <div className="text-[10px] text-black-45 mt-1">
            {{ 5: "32mm · 처음 쓰기", 8: "20mm · 기본", 10: "16mm · 받아쓰기" }[
              parseInt(config.notebook_type)
            ] || ""}
          </div>
        </div>
        <div className="flex-1">
          <label className={labelCls}>행 수</label>
          <input
            type="number"
            className={inputCls}
            value={config.row_count || 2}
            min={1}
            max={spec.maxRows}
            onChange={(e) =>
              onUpdate((c) => ({
                ...c,
                row_count: Math.min(Math.max(parseInt(e.target.value) || 1, 1), spec.maxRows),
              }))
            }
          />
          <div className="text-[10px] text-black-45 mt-1">
            최대 {spec.maxRows}행 ({config.notebook_type || "8칸"} 노트 기준)
          </div>
        </div>
      </div>
      <div className="flex gap-4 mb-3">
        <label className="flex items-center gap-1.5 cursor-pointer text-xs">
          <input
            type="checkbox"
            checked={config.show_model}
            onChange={(e) => onUpdate((c) => ({ ...c, show_model: e.target.checked }))}
          />
          모델 문장 표시
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer text-xs">
          <input
            type="checkbox"
            checked={config.show_guide}
            onChange={(e) => onUpdate((c) => ({ ...c, show_guide: e.target.checked }))}
          />
          가이드 글자 표시
        </label>
      </div>
      <div>
        <label className={labelCls}>단어 / 문장 입력</label>
        <input
          type="text"
          className={inputCls}
          value={config.text || ""}
          placeholder="예: 저 바나나우유 주세요."
          onChange={(e) => onUpdate((c) => ({ ...c, text: e.target.value }))}
        />
        <div className="text-[10px] text-black-45 mt-1">
          공백 &rarr; 빈칸, 음절/문장부호 &rarr; 셀 1개씩 자동 배치
        </div>
      </div>
    </>
  );
};

// --- Coloring Area ---
export const ColoringAreaForm = ({ config, onUpdate }: FormProps<ColoringAreaConfig>) => (
  <>
    <div className="mb-3">
      <label className={labelCls}>이미지 설명</label>
      <input
        type="text"
        className={inputCls}
        value={config.image_description || ""}
        onChange={(e) => onUpdate((c) => ({ ...c, image_description: e.target.value }))}
      />
    </div>
    <div>
      <label className={labelCls}>영역 비율</label>
      <input
        type="number"
        className={inputCls}
        value={config.size_ratio}
        min={0.3}
        max={0.8}
        step={0.05}
        onChange={(e) =>
          onUpdate((c) => ({ ...c, size_ratio: parseFloat(e.target.value) || 0.6 }))
        }
      />
      <div className="text-[10px] text-black-45 mt-1">0.6 = 페이지의 60%</div>
    </div>
  </>
);
