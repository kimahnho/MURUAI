import { Loader2 } from "lucide-react";

type SpinnerSize = "sm" | "md" | "lg";

interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
}

const SIZE_CLASS: Record<SpinnerSize, string> = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-7 w-7",
};

const Spinner = ({ size = "md", className = "" }: SpinnerProps) => {
  return (
    <Loader2
      className={`animate-spin ${SIZE_CLASS[size]} ${className}`}
      aria-hidden="true"
    />
  );
};

export default Spinner;
