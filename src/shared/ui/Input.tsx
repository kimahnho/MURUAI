import type { InputHTMLAttributes, ReactNode } from "react";

type InputSize = "sm" | "md";

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: InputSize;
  label?: string;
  error?: string;
  leftIcon?: ReactNode;
  isRequired?: boolean;
}

const SIZE_CLASS: Record<InputSize, string> = {
  sm: "px-3 py-2 text-14-regular",
  md: "px-4 py-3 text-15-regular",
};

const Input = ({
  size = "md",
  label,
  error,
  leftIcon,
  isRequired,
  className = "",
  id,
  ...rest
}: InputProps) => {
  const inputId = id ?? (label ? `input-${label}` : undefined);

  return (
    <div className="flex flex-col">
      {label && (
        <label htmlFor={inputId} className="text-14-semibold text-black-90 mb-1.5 block">
          {label}
          {isRequired && <span className="text-error ml-0.5">*</span>}
        </label>
      )}

      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-black-50 shrink-0">
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          className={`w-full rounded-lg border text-black-90 placeholder:text-black-50 transition focus:outline-none disabled:bg-black-5 disabled:text-black-60 disabled:cursor-not-allowed ${
            error ? "border-error" : "border-black-25 focus:border-primary"
          } ${leftIcon ? "pl-10" : ""} ${SIZE_CLASS[size]} ${className}`}
          {...rest}
        />
      </div>

      {error && (
        <p className="text-12-regular text-error mt-1">{error}</p>
      )}
    </div>
  );
};

export default Input;
