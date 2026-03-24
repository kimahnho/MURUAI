import type { ButtonHTMLAttributes, ReactNode } from "react";

import Spinner from "@/shared/ui/Spinner";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "destructive";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
  children: ReactNode;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white-100 hover:bg-primary-700",
  secondary:
    "border border-primary text-primary hover:bg-primary-50",
  outline:
    "border border-black-25 text-black-90 hover:border-black-40 hover:bg-black-5",
  ghost:
    "text-black-70 hover:bg-black-5",
  destructive:
    "bg-error-50 border border-error-100 text-error-700 hover:bg-error-100",
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-14-semibold rounded-lg",
  md: "px-4 py-2.5 text-14-semibold rounded-xl",
  lg: "px-6 py-3 text-title-16-semibold rounded-xl",
};

const Button = ({
  variant = "primary",
  size = "md",
  isLoading = false,
  icon,
  fullWidth = false,
  children,
  disabled,
  className = "",
  ...rest
}: ButtonProps) => {
  const isDisabled = disabled || isLoading;

  return (
    <button
      type="button"
      disabled={isDisabled}
      className={`inline-flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${VARIANT_CLASS[variant]} ${SIZE_CLASS[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {isLoading && <Spinner size="sm" />}
      {!isLoading && icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
};

export default Button;
