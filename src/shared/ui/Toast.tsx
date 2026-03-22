type ToastVariant = "default" | "primary" | "success";

interface ToastProps {
  message: string;
  variant?: ToastVariant;
  isVisible: boolean;
}

const VARIANT_CLASS: Record<ToastVariant, string> = {
  default: "bg-black-90 text-white-100",
  primary: "bg-primary text-white-100",
  success: "bg-success-500 text-white-100",
};

const Toast = ({ message, variant = "default", isVisible }: ToastProps) => {
  return (
    <div
      className={`fixed left-1/2 top-5 z-10000 -translate-x-1/2 rounded-full px-5 py-2.5 text-14-medium shadow-lg transition-all duration-300 ${
        VARIANT_CLASS[variant]
      } ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"}`}
    >
      {message}
    </div>
  );
};

export default Toast;
