import { useState } from "react";

interface UseNumberInputOptions {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  /** true이면 입력할 때마다 즉시 onChange를 호출 */
  immediate?: boolean;
}

/**
 * 숫자 입력 필드를 관리하는 커스텀 훅
 * 검증, 포맷팅, 편집 상태 관리를 제공
 *
 * @example
 * const widthInput = useNumberInput({
 *   value: width,
 *   min: 1,
 *   max: 1000,
 *   onChange: handleWidthChange,
 * });
 *
 * <input
 *   value={widthInput.displayValue}
 *   onChange={(e) => widthInput.handleChange(e.target.value)}
 *   onBlur={widthInput.handleBlur}
 *   onFocus={widthInput.handleFocus}
 *   onKeyDown={(e) => e.key === 'Enter' && widthInput.commit()}
 * />
 */
export const useNumberInput = ({
  value,
  min,
  max,
  onChange,
  immediate = false,
}: UseNumberInputOptions) => {
  const [inputValue, setInputValue] = useState(() => String(Math.round(value)));
  const [isEditing, setIsEditing] = useState(false);

  const clamp = (num: number): number => {
    let result = num;
    if (typeof min === "number") result = Math.max(min, result);
    if (typeof max === "number") result = Math.min(max, result);
    return result;
  };

  const commit = () => {
    const digits = inputValue.replace(/[^0-9]/g, "");
    if (!digits) {
      setInputValue(String(Math.round(value)));
      return;
    }
    const nextValue = clamp(Number(digits));
    setInputValue(String(Math.round(nextValue)));
    if (nextValue !== value) {
      onChange(nextValue);
    }
  };

  const handleChange = (newValue: string) => {
    const digits = newValue.replace(/[^0-9]/g, "");
    setInputValue(digits);
    if (immediate && digits) {
      const nextValue = clamp(Number(digits));
      onChange(nextValue);
    }
  };

  const handleFocus = (event?: React.FocusEvent<HTMLInputElement>) => {
    setInputValue(String(Math.round(value)));
    setIsEditing(true);
    event?.target.select();
  };

  const handleBlur = () => {
    if (!isEditing) return;
    setIsEditing(false);
    commit();
  };

  const step = (delta: number) => {
    const nextValue = clamp(value + delta);
    onChange(nextValue);
    if (isEditing) {
      setInputValue(String(Math.round(nextValue)));
    }
  };

  return {
    displayValue: isEditing ? inputValue : String(Math.round(value)),
    inputValue,
    isEditing,
    handleChange,
    handleFocus,
    handleBlur,
    commit,
    step,
  };
};
