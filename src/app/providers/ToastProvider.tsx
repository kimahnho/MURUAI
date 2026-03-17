import { useEffect, useRef, useState } from "react";

import useToastStore from "@/shared/store/useToastStore";
import Toast from "@/shared/ui/Toast";

const TOAST_DURATION_MS = 2000;

const ToastProvider = () => {
  const message = useToastStore((s) => s.message);
  const variant = useToastStore((s) => s.variant);
  const clearToast = useToastStore((s) => s.clearToast);

  const [isVisible, setIsVisible] = useState(false);
  const [displayMessage, setDisplayMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (message) {
      setDisplayMessage(message);
      setIsVisible(true);

      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => {
          clearToast();
          setDisplayMessage(null);
        }, 300);
      }, TOAST_DURATION_MS);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [message, clearToast]);

  if (!displayMessage) return null;

  return <Toast message={displayMessage} variant={variant} isVisible={isVisible} />;
};

export default ToastProvider;
