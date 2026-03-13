/**
 * 2단계: 주제 입력 — 자유 입력(2~200자) 또는 6개 프리셋 중 선택.
 */
import { useStorybookWizardStore } from "../../store/useStorybookWizardStore";
import {
  TOPIC_PRESETS,
  TOPIC_MAX_LENGTH,
} from "../../model/storybookTypes";

const TopicStep = () => {
  const topic = useStorybookWizardStore((s) => s.formData.topic);
  const setTopic = useStorybookWizardStore((s) => s.setTopic);

  return (
    <div className="flex flex-col gap-4">
      {/* 자유 입력 */}
      <div className="relative">
        <textarea
          value={topic}
          onChange={(e) => { setTopic(e.target.value); }}
          placeholder="예: 처음 유치원에 가는 날, 친구와 사이좋게 지내기"
          maxLength={TOPIC_MAX_LENGTH}
          rows={3}
          className="w-full resize-none rounded-lg border border-black-25 px-3 py-2 text-14-regular focus:border-primary focus:outline-none"
        />
        <span className="absolute bottom-2 right-3 text-12-medium text-black-40">
          {topic.length}/{TOPIC_MAX_LENGTH}
        </span>
      </div>

      {/* 프리셋 */}
      <div className="flex flex-col gap-1">
        <span className="text-12-medium text-black-50">추천 주제</span>
        <div className="flex flex-wrap gap-2">
          {TOPIC_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => { setTopic(preset); }}
              className={`rounded-full border px-3 py-1.5 text-13-medium transition ${
                topic === preset
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-black-25 text-black-60 hover:bg-black-10"
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TopicStep;
