/**
 * 1단계: 나이 입력 — 스토리 난이도와 어휘 수준을 결정하는 유일한 입력.
 */
import { useState } from "react";

import { useStorybookWizardStore } from "../../store/useStorybookWizardStore";

const ChildInfoStep = () => {
  const childInfo = useStorybookWizardStore((s) => s.formData.childInfo);
  const setChildInfo = useStorybookWizardStore((s) => s.setChildInfo);

  const [ageInput, setAgeInput] = useState(
    childInfo?.age ? String(childInfo.age) : "",
  );

  const handleChange = (value: string) => {
    // 숫자만 허용
    const cleaned = value.replace(/[^0-9]/g, "").slice(0, 2);
    setAgeInput(cleaned);

    const num = parseInt(cleaned, 10);
    if (!isNaN(num) && num >= 1 && num <= 19) {
      setChildInfo({
        id: childInfo?.id ?? crypto.randomUUID(),
        age: num,
      });
    }
  };

  const handleBlur = () => {
    const num = parseInt(ageInput, 10);
    if (isNaN(num) || num < 1) {
      setAgeInput("");
      setChildInfo({ id: childInfo?.id ?? crypto.randomUUID(), age: 0 });
      return;
    }
    const clamped = Math.min(19, Math.max(1, num));
    setAgeInput(String(clamped));
    setChildInfo({
      id: childInfo?.id ?? crypto.randomUUID(),
      age: clamped,
    });
  };

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div className="flex flex-col items-center gap-2">
        <span className="text-title-16-semibold text-black-90">
          아이의 나이를 알려주세요
        </span>
        <span className="text-14-regular text-black-60 text-center">
          나이에 따라 이야기의 문장 구성과 내용이 달라져요
        </span>
      </div>

      <div className="flex items-end gap-2">
        <input
          type="text"
          inputMode="numeric"
          value={ageInput}
          onChange={(e) => { handleChange(e.target.value); }}
          onBlur={handleBlur}
          placeholder="나이"
          className="w-20 rounded-xl border border-black-20 px-4 py-3 text-center text-title-20-semibold text-black-90 focus:border-primary focus:outline-none"
        />
        <span className="text-16-semibold text-black-60 pb-3">세</span>
      </div>
    </div>
  );
};

export default ChildInfoStep;
