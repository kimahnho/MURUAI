/** 컴포넌트별 속성 편집 폼 */
import { useState, useRef } from "react";
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
  SentenceCompletionConfig,
  SentenceFillConfig,
  PassageQuestionConfig,
  MatchingConnectConfig,
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
            className={`${inputCls} flex-1 min-w-16`}
            value={r.syllable}
            placeholder="바"
            onChange={(e) =>
              onUpdate((c) => ({
                ...c,
                rows: c.rows.map((rr, i) => (i === j ? { ...rr, syllable: e.target.value } : rr)),
              }))
            }
          />
          <input
            type="number"
            className={`${inputCls} w-11`}
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
export const ColoringAreaForm = ({ config, onUpdate }: FormProps<ColoringAreaConfig>) => {
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/svg+xml"].includes(file.type)) {
      return;
    }
    // imageFillStore를 동적 import (테스트 단계 — 의존성 규칙 예외)
    const { useImageFillStore } = await import("@/features/editor/store/imageFillStore");
    const localUrl = URL.createObjectURL(file);
    useImageFillStore.getState().requestImageFill(localUrl, undefined, undefined, { forceInsert: false });
  };

  return (
  <>
    <div className="mb-3">
      <label className={labelCls}>이미지 삽입</label>
      <p className="text-[10px] text-black-45 mb-2">JPG, PNG, SVG 지원</p>
      <label
        className={`${addBtnCls} flex items-center justify-center gap-1.5 cursor-pointer`}
      >
        🖼 이미지 선택
        <input
          type="file"
          accept="image/jpeg,image/png,image/svg+xml"
          className="hidden"
          onChange={handleImageUpload}
        />
      </label>
      <p className="text-[10px] text-black-45 mt-1.5">
        또는 캔버스에서 프레임을 클릭 후 왼쪽 이미지 탭에서 삽입
      </p>
      <button
        type="button"
        className={`${addBtnCls} mt-2 flex items-center justify-center gap-1.5`}
        onClick={async () => {
          const { useWorksheetElementStore } = await import("@/features/editor/store/worksheetElementStore");
          const { useSideBarStore } = await import("@/features/editor/store/sideBarStore");
          const { useElementPanelStore } = await import("@/features/editor/store/elementPanelStore");
          // props 오버레이(도형/텍스트 편집 패널)를 닫아야 AI 이미지 탭이 보임
          useElementPanelStore.setState({ panelData: null });
          useWorksheetElementStore.getState().requestColoringAi();
          useSideBarStore.getState().setSelectedMenu("design");
        }}
      >
        ✨ 색칠공부 그림 생성
      </button>
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
};

// --- Sentence Completion ---
export const SentenceCompletionForm = ({ config, onUpdate }: FormProps<SentenceCompletionConfig>) => {
  // 보기: 로컬 raw 문자열 유지 (쉼표 보존) + 매 입력마다 config 즉시 반영
  const [wordBankRaw, setWordBankRaw] = useState((config.word_bank || []).join(", "));
  const wordBankRef = useRef(config.word_bank);
  // 외부에서 config가 바뀌면 (undo 등) 로컬 동기화
  if (config.word_bank !== wordBankRef.current) {
    wordBankRef.current = config.word_bank;
    setWordBankRaw((config.word_bank || []).join(", "));
  }

  const handleWordBankChange = (raw: string) => {
    setWordBankRaw(raw);
    // 매 입력마다 즉시 파싱 → config 반영 (캔버스 실시간 업데이트)
    if (raw.trim() === "") {
      wordBankRef.current = null;
      onUpdate((c) => ({ ...c, word_bank: null }));
    } else {
      const words = raw.split(",").map((w) => w.trim()).filter(Boolean);
      const next = words.length > 0 ? words : null;
      wordBankRef.current = next;
      onUpdate((c) => ({ ...c, word_bank: next }));
    }
  };

  return (
    <>
      {/* 보기 (word bank) — 쉼표 구분 단일 입력, 실시간 반영 */}
      <div className="mb-3">
        <label className={labelCls}>보기 (word bank)</label>
        <p className="text-[10px] text-black-45 mb-1.5">쉼표(,)로 구분하여 입력 · 비우면 보기 없음</p>
        <input
          type="text"
          className={inputCls}
          value={wordBankRaw}
          placeholder="가, 이, 는, 에, 를"
          onChange={(e) => handleWordBankChange(e.target.value)}
        />
      </div>

      {/* 문장 목록 */}
      <div className="mb-3">
        <label className={labelCls}>문장 (빈칸은 ___ 로 입력)</label>
        {config.sentences.map((s, i) => (
          <div key={i} className={itemRowCls}>
            <input
              type="text"
              className={`${inputCls} flex-1`}
              value={s.template}
              placeholder="할머니___ 거실___ 신문___ 읽는다."
              onChange={(e) =>
                onUpdate((c) => ({
                  ...c,
                  sentences: c.sentences.map((ss, j) =>
                    j === i ? { ...ss, template: e.target.value } : ss,
                  ),
                }))
              }
            />
            <button
              type="button"
              className={removeBtnCls}
              onClick={() =>
                onUpdate((c) => ({
                  ...c,
                  sentences: c.sentences.filter((_, j) => j !== i),
                }))
              }
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          className={addBtnCls}
          onClick={() =>
            onUpdate((c) => ({
              ...c,
              sentences: [...c.sentences, { template: "" }],
            }))
          }
        >
          + 문장 추가
        </button>
      </div>

      {/* 글꼴 크기 */}
      <div className="mb-3">
        <label className={labelCls}>글꼴 크기</label>
        <input
          type="number"
          className={inputCls}
          value={config.font_size}
          min={14}
          max={24}
          onChange={(e) =>
            onUpdate((c) => ({ ...c, font_size: Number(e.target.value) }))
          }
        />
      </div>
    </>
  );
};

// --- Sentence Fill ---
export const SentenceFillForm = ({ config, onUpdate }: FormProps<SentenceFillConfig>) => {
  // 보기 쉼표 구분 로컬 state
  const [wbRaw, setWbRaw] = useState((config.word_bank || []).join(", "));
  const wbRef = useRef(config.word_bank);
  if (config.word_bank !== wbRef.current) {
    wbRef.current = config.word_bank;
    setWbRaw((config.word_bank || []).join(", "));
  }
  const handleWbChange = (raw: string) => {
    setWbRaw(raw);
    if (raw.trim() === "") {
      wbRef.current = null;
      onUpdate((c) => ({ ...c, word_bank: null }));
    } else {
      const words = raw.split(",").map((w) => w.trim()).filter(Boolean);
      const next = words.length > 0 ? words : null;
      wbRef.current = next;
      onUpdate((c) => ({ ...c, word_bank: next }));
    }
  };

  return (
    <>
      {/* 모드 선택 */}
      <div className="mb-3">
        <label className={labelCls}>모드</label>
        <div className={chipGroupCls}>
          {(["blank", "word_bank", "judge"] as const).map((m) => (
            <Chip
              key={m}
              label={m === "blank" ? "빈칸" : m === "word_bank" ? "보기 제공" : "O/X 판단"}
              isActive={config.mode === m}
              onClick={() => {
                const updates: Partial<SentenceFillConfig> = { mode: m };
                if (m === "word_bank" && !config.word_bank) updates.word_bank = [""];
                if (m === "judge") updates.show_correction_line = true;
                onUpdate((c) => ({ ...c, ...updates }));
              }}
            />
          ))}
        </div>
      </div>

      {/* 보기 (word_bank 모드) */}
      {config.mode === "word_bank" && (
        <div className="mb-3">
          <label className={labelCls}>보기 단어</label>
          <p className="text-[10px] text-black-45 mb-1.5">쉼표(,)로 구분하여 입력</p>
          <input
            type="text"
            className={inputCls}
            value={wbRaw}
            placeholder="먹었어요, 먹어요, 먹을 거예요"
            onChange={(e) => handleWbChange(e.target.value)}
          />
        </div>
      )}

      {/* 문장 목록 */}
      <div className="mb-3">
        <label className={labelCls}>
          문장 {config.mode === "judge" ? "(앞에 ( ) 입력)" : "(빈칸은 ___ 로 입력)"}
        </label>
        {config.sentences.map((s, i) => (
          <div key={i} className={`${itemRowCls} flex-col items-stretch`}>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                className={`${inputCls} flex-1`}
                value={s.template}
                placeholder={config.mode === "judge" ? "( ) 어제 마트에 갈 거예요" : "___가 밥을 먹어요."}
                onChange={(e) =>
                  onUpdate((c) => ({
                    ...c,
                    sentences: c.sentences.map((ss, j) => (j === i ? { ...ss, template: e.target.value } : ss)),
                  }))
                }
              />
              <button type="button" className={removeBtnCls} onClick={() => onUpdate((c) => ({ ...c, sentences: c.sentences.filter((_, j) => j !== i) }))}>×</button>
            </div>
          </div>
        ))}
        <button type="button" className={addBtnCls} onClick={() => onUpdate((c) => ({ ...c, sentences: [...c.sentences, { template: "", correct_answer: null }] }))}>+ 문장 추가</button>
      </div>

      {/* 간격 */}
      <div className="mb-3">
        <label className={labelCls}>문장 간격</label>
        <div className={chipGroupCls}>
          {(["compact", "normal", "wide"] as const).map((v) => (
            <Chip
              key={v}
              label={v === "compact" ? "좁게" : v === "normal" ? "보통" : "넓게"}
              isActive={config.line_spacing === v}
              onClick={() => onUpdate((c) => ({ ...c, line_spacing: v }))}
            />
          ))}
        </div>
      </div>

      {/* judge 모드 전용 */}
      {config.mode === "judge" && (
        <div className="mb-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={config.show_correction_line} onChange={(e) => onUpdate((c) => ({ ...c, show_correction_line: e.target.checked }))} className="w-4 h-4" />
            <span className="text-[12px] text-black-70">수정 쓰기 라인 표시</span>
          </label>
        </div>
      )}

      {/* 글꼴 크기 */}
      <div className="mb-3">
        <label className={labelCls}>글꼴 크기</label>
        <input type="number" className={inputCls} value={config.font_size} min={14} max={24} onChange={(e) => onUpdate((c) => ({ ...c, font_size: Number(e.target.value) }))} />
      </div>
    </>
  );
};

// --- Passage Question ---
// --- Passage Question ---
const DEFAULT_CHOICES = ["", "", ""];

export const PassageQuestionForm = ({ config, onUpdate }: FormProps<PassageQuestionConfig>) => {
  // 질문별 선택지 펼침 상태
  const [expandedChoices, setExpandedChoices] = useState<Set<number>>(new Set());
  const toggleChoices = (idx: number) =>
    setExpandedChoices((prev) => { const next = new Set(prev); next.has(idx) ? next.delete(idx) : next.add(idx); return next; });

  const updateQ = (i: number, patch: Partial<PassageQuestionConfig["questions"][number]>) =>
    onUpdate((c) => ({ ...c, questions: c.questions.map((qq, j) => (j === i ? { ...qq, ...patch } : qq)) }));

  return (
    <>
      {/* 지시문 (선택) */}
      <div className="mb-3">
        <label className={labelCls}>지시문 (선택)</label>
        <input
          type="text"
          className={inputCls}
          value={config.instruction}
          placeholder="예: 이야기를 읽고 질문에 답해 보세요."
          onChange={(e) => onUpdate((c) => ({ ...c, instruction: e.target.value }))}
        />
      </div>

      {/* 지문 */}
      <div className="mb-3">
        <label className={labelCls}>지문 (이야기)</label>
        <textarea
          className={textareaCls}
          rows={4}
          value={config.passage || ""}
          placeholder="2~5문장의 짧은 이야기를 입력하세요. 비우면 질문만 표시됩니다."
          onChange={(e) => onUpdate((c) => ({ ...c, passage: e.target.value || null }))}
        />
      </div>

      {/* 지문 배경색 */}
      <div className="mb-3">
        <label className={labelCls}>지문 배경색</label>
        <div className={chipGroupCls}>
          {[
            { value: "#FFF9E6", label: "노란" },
            { value: "#E8F4FD", label: "파란" },
            { value: "#F3E8FF", label: "보라" },
            { value: "#E8F5E9", label: "초록" },
            { value: "#FFFFFF", label: "없음" },
          ].map((c) => (
            <Chip key={c.value} label={c.label} isActive={config.passage_background === c.value} onClick={() => onUpdate((prev) => ({ ...prev, passage_background: c.value }))} />
          ))}
        </div>
      </div>

      {/* 답변 밑줄 길이 (주관식용) */}
      <div className="mb-3">
        <label className={labelCls}>주관식 답변 밑줄 길이</label>
        <div className={chipGroupCls}>
          {(["short", "medium", "full"] as const).map((v) => (
            <Chip key={v} label={v === "short" ? "짧게" : v === "medium" ? "보통" : "전체폭"} isActive={config.answer_line_length === v} onClick={() => onUpdate((c) => ({ ...c, answer_line_length: v }))} />
          ))}
        </div>
      </div>

      {/* 질문 목록 */}
      <div className="mb-3">
        <label className={labelCls}>질문 목록</label>
        {config.questions.map((q, i) => (
          <div key={i} className="mb-2 p-2 bg-black-5 rounded-lg">
            {/* 질문 입력 + 삭제 */}
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-[11px] font-bold text-black-50 shrink-0">{i + 1}.</span>
              <input
                type="text"
                className={`${inputCls} flex-1`}
                value={q.question_text}
                placeholder="질문을 입력하세요"
                onChange={(e) => updateQ(i, { question_text: e.target.value })}
              />
              <button type="button" className={removeBtnCls} onClick={() => onUpdate((c) => ({ ...c, questions: c.questions.filter((_, j) => j !== i) }))}>×</button>
            </div>

            {/* 주관식 / 객관식 전환 */}
            <div className="flex gap-1 mb-1.5">
              <Chip label="주관식" isActive={q.answer_type === "subjective"} onClick={() => updateQ(i, { answer_type: "subjective" })} />
              <Chip label="객관식" isActive={q.answer_type === "multiple_choice"} onClick={() => updateQ(i, { answer_type: "multiple_choice", choices: q.choices.length >= 2 ? q.choices : [...DEFAULT_CHOICES] })} />
            </div>

            {/* 객관식 선택지 */}
            {q.answer_type === "multiple_choice" && (
              <div className="ml-3">
                <button
                  type="button"
                  className="text-[11px] text-primary font-semibold mb-1 cursor-pointer hover:underline"
                  onClick={() => toggleChoices(i)}
                >
                  {expandedChoices.has(i) ? "▾ 선택지 접기" : "▸ 선택지 입력하기"} ({q.choices.length}개)
                </button>
                {expandedChoices.has(i) && (
                  <div className="flex flex-col gap-1">
                    {q.choices.map((ch, ci) => (
                      <div key={ci} className="flex items-center gap-1">
                        <span className="text-[10px] text-black-50 shrink-0 w-4">{"①②③④⑤"[ci]}</span>
                        <input
                          type="text"
                          className={`${inputCls} flex-1 !py-1 !text-[12px]`}
                          value={ch}
                          placeholder={`선택지 ${ci + 1}`}
                          onChange={(e) =>
                            updateQ(i, { choices: q.choices.map((c, cj) => (cj === ci ? e.target.value : c)) })
                          }
                        />
                        {q.choices.length > 2 && (
                          <button type="button" className={`${removeBtnCls} !w-5 !h-5 !text-[11px]`} onClick={() => updateQ(i, { choices: q.choices.filter((_, cj) => cj !== ci) })}>×</button>
                        )}
                      </div>
                    ))}
                    {q.choices.length < 5 && (
                      <button
                        type="button"
                        className="text-[11px] text-primary hover:underline cursor-pointer mt-0.5"
                        onClick={() => updateQ(i, { choices: [...q.choices, ""] })}
                      >
                        + 선택지 추가 (최대 5개)
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        <button
          type="button"
          className={addBtnCls}
          onClick={() => onUpdate((c) => ({
            ...c,
            questions: [...c.questions, { question_text: "", answer_type: "subjective" as const, answer_space: "line" as const, choices: [] }],
          }))}
        >
          + 질문 추가
        </button>
      </div>
    </>
  );
};

// --- Matching Connect ---
export const MatchingConnectForm = ({ config, onUpdate }: FormProps<MatchingConnectConfig>) => (
  <>
    {/* 헤더 라벨 */}
    <div className="mb-3 flex gap-2">
      <div className="flex-1">
        <label className={labelCls}>좌측 헤더</label>
        <input type="text" className={inputCls} value={config.left_header || ""} placeholder="어휘나 표현" onChange={(e) => onUpdate((c) => ({ ...c, left_header: e.target.value || null }))} />
      </div>
      <div className="flex-1">
        <label className={labelCls}>우측 헤더</label>
        <input type="text" className={inputCls} value={config.right_header || ""} placeholder="뜻" onChange={(e) => onUpdate((c) => ({ ...c, right_header: e.target.value || null }))} />
      </div>
    </div>

    {/* 매칭 쌍 */}
    <div className="mb-3">
      <label className={labelCls}>매칭 쌍 (입력 순서 = 정답)</label>
      <p className="text-[10px] text-black-45 mb-1.5">우측 항목은 캔버스에서 자동 셔플됩니다</p>
      {config.pairs.map((p, i) => (
        <div key={i} className="mb-1.5 p-2 bg-black-5 rounded-lg">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[11px] font-bold text-black-50 shrink-0 w-4">{"①②③④⑤⑥⑦⑧"[i]}</span>
            <input
              type="text" className={`${inputCls} flex-1`} value={p.left} placeholder="좌측 항목"
              onChange={(e) => onUpdate((c) => ({ ...c, pairs: c.pairs.map((pp, j) => (j === i ? { ...pp, left: e.target.value } : pp)) }))}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-black-40 shrink-0 w-4">↔</span>
            <input
              type="text" className={`${inputCls} flex-1`} value={p.right} placeholder="우측 항목"
              onChange={(e) => onUpdate((c) => ({ ...c, pairs: c.pairs.map((pp, j) => (j === i ? { ...pp, right: e.target.value } : pp)) }))}
            />
            {config.pairs.length > 3 && (
              <button type="button" className={removeBtnCls} onClick={() => onUpdate((c) => ({ ...c, pairs: c.pairs.filter((_, j) => j !== i) }))}>×</button>
            )}
          </div>
        </div>
      ))}
      {config.pairs.length < 8 && (
        <button type="button" className={addBtnCls} onClick={() => onUpdate((c) => ({ ...c, pairs: [...c.pairs, { left: "", right: "" }] }))}>+ 쌍 추가 (최대 8개)</button>
      )}
    </div>

    {/* 항목 모양 */}
    <div className="mb-3">
      <label className={labelCls}>항목 모양</label>
      <div className={chipGroupCls}>
        {(["rounded_rect", "pill"] as const).map((v) => (
          <Chip key={v} label={v === "rounded_rect" ? "둥근사각형" : "알약형"}
            isActive={config.item_style.shape === v}
            onClick={() => onUpdate((c) => ({ ...c, item_style: { ...c.item_style, shape: v } }))} />
        ))}
      </div>
    </div>

    {/* 글자 크기 */}
    <div className="mb-3">
      <label className={labelCls}>글꼴 크기</label>
      <input type="number" className={inputCls} value={config.item_style.font_size} min={14} max={22}
        onChange={(e) => onUpdate((c) => ({ ...c, item_style: { ...c.item_style, font_size: Number(e.target.value) } }))} />
    </div>

    {/* 정답 표시 (교사용) */}
    <div className="mb-3">
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={config.show_answer_key} onChange={(e) => onUpdate((c) => ({ ...c, show_answer_key: e.target.checked }))} className="w-4 h-4" />
        <span className="text-[12px] text-black-70">정답 표시 (교사용)</span>
      </label>
      {config.show_answer_key && (
        <div className="mt-1.5">
          <input
            type="text"
            className={inputCls}
            value={config.answer_key_text}
            placeholder="예: ①-다, ②-가, ③-나"
            onChange={(e) => onUpdate((c) => ({ ...c, answer_key_text: e.target.value }))}
          />
          <p className="text-[10px] text-black-45 mt-1">캔버스 하단에 표시됩니다</p>
        </div>
      )}
    </div>
  </>
);
