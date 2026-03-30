/**
 * shadcn Avatar — studio 전용.
 */
import * as React from "react";
import { cn } from "../lib/utils";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-7 w-7 text-12-semibold",
  md: "h-9 w-9 text-14-semibold",
  lg: "h-11 w-11 text-title-16-semibold",
};

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, size = "md", children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary",
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
);
Avatar.displayName = "Avatar";

export { Avatar };
