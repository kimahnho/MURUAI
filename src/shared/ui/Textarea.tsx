import type { TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  isRequired?: boolean;
}

const Textarea = ({
  label,
  error,
  isRequired,
  className = "",
  id,
  ...rest
}: TextareaProps) => {
  const textareaId = id ?? (label ? `textarea-${label}` : undefined);

  return (
    <div className="flex flex-col">
      {label && (
        <label htmlFor={textareaId} className="text-14-semibold text-black-90 mb-1.5 block">
          {label}
          {isRequired && <span className="text-error ml-0.5">*</span>}
        </label>
      )}

      <textarea
        id={textareaId}
        className={`w-full rounded-lg border px-4 py-3 text-15-regular text-black-90 placeholder:text-black-50 resize-none transition focus:outline-none disabled:bg-black-5 disabled:text-black-60 disabled:cursor-not-allowed ${
          error ? "border-error" : "border-black-25 focus:border-primary"
        } ${className}`}
        {...rest}
      />

      {error && (
        <p className="text-12-regular text-error mt-1">{error}</p>
      )}
    </div>
  );
};

export default Textarea;
