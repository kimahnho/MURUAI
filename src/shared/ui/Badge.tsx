import type { ReactNode } from "react";

type BadgeVariant = "default" | "primary" | "success" | "warning" | "error";

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const VARIANT_CLASS: Record<BadgeVariant, string> = {
  default: "bg-black-5 text-black-60",
  primary: "bg-primary-100 text-primary-800",
  success: "bg-success-50 text-success-700",
  warning: "bg-warning-50 text-warning-700",
  error: "bg-error-50 text-error-700",
};

const Badge = ({ variant = "default", children, className = "" }: BadgeProps) => {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-12-regular ${VARIANT_CLASS[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;
