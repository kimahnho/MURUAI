import type { SelectHTMLAttributes } from "react";

import { ChevronDown } from "lucide-react";

type SelectSize = "sm" | "md";

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  size?: SelectSize;
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  isRequired?: boolean;
}

const SIZE_CLASS: Record<SelectSize, string> = {
  sm: "px-3 py-2 text-14-regular",
  md: "px-4 py-3 text-15-regular",
};

const Select = ({
  size = "md",
  label,
  error,
  options,
  placeholder,
  isRequired,
  className = "",
  id,
  ...rest
}: SelectProps) => {
  const selectId = id ?? (label ? `select-${label}` : undefined);

  return (
    <div className="flex flex-col">
      {label && (
        <label htmlFor={selectId} className="text-14-semibold text-black-90 mb-1.5 block">
          {label}
          {isRequired && <span className="text-error ml-0.5">*</span>}
        </label>
      )}

      <div className="relative">
        <select
          id={selectId}
          className={`w-full appearance-none rounded-lg border pr-10 text-black-90 transition focus:outline-none disabled:bg-black-5 disabled:text-black-60 disabled:cursor-not-allowed ${
            error ? "border-error" : "border-black-25 focus:border-primary"
          } ${SIZE_CLASS[size]} ${className}`}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>

        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black-50" />
      </div>

      {error && (
        <p className="text-12-regular text-error mt-1">{error}</p>
      )}
    </div>
  );
};

export default Select;
