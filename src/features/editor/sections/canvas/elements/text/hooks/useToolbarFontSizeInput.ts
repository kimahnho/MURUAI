import { useState } from "react";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const useToolbarFontSizeInput = ({
  displayValue,
  min,
  max,
  onCommitValue,
}: {
  displayValue: string;
  min: number;
  max: number;
  onCommitValue: (value: number) => void;
}) => {
  const [draftValue, setDraftValue] = useState(displayValue);
  const [isDirty, setIsDirty] = useState(false);
  const value = isDirty ? draftValue : displayValue;

  const onChange = (nextValue: string) => {
    const sanitized = nextValue.replace(/[^0-9]/g, "").slice(0, 3);
    setDraftValue(sanitized);
    setIsDirty(true);
  };

  const onCommit = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      setDraftValue(displayValue);
      setIsDirty(false);
      return;
    }

    const next = Number(trimmed);
    if (!Number.isFinite(next) || next <= 0) {
      setDraftValue(displayValue);
      setIsDirty(false);
      return;
    }

    const clamped = clamp(Math.round(next), min, max);
    onCommitValue(clamped);
    setDraftValue(String(clamped));
    setIsDirty(false);
  };

  const onCancel = () => {
    setDraftValue(displayValue);
    setIsDirty(false);
  };

  const onFocus = () => {
    if (!isDirty && displayValue === "--") {
      setDraftValue("");
      setIsDirty(true);
    }
  };

  return {
    value,
    isDirty,
    onChange,
    onCommit,
    onCancel,
    onFocus,
  };
};
