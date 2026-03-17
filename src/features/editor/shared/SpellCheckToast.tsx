/**
 * 맞춤법 검사 완료 후 하단에 표시되는 알림 토스트.
 * 위아래 미세 바운스 애니메이션 + 자동 소멸.
 */
import { useEffect, useState } from "react";
import { SpellCheck } from "lucide-react";
import { useSpellCheckStore } from "../store/spellCheckStore";

const TOAST_DURATION_MS = 5000;

const SpellCheckToast = () => {
  const isToastVisible = useSpellCheckStore((s) => s.isToastVisible);
  const hideToast = useSpellCheckStore((s) => s.hideToast);
  const openPanel = useSpellCheckStore((s) => s.openPanel);
  const results = useSpellCheckStore((s) => s.results);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    if (!isToastVisible) {
      setIsFading(false);
      return;
    }
    // 페이드아웃 시작 (소멸 500ms 전)
    const fadeTimer = window.setTimeout(() => {
      setIsFading(true);
    }, TOAST_DURATION_MS - 500);
    const hideTimer = window.setTimeout(hideToast, TOAST_DURATION_MS);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, [isToastVisible, hideToast]);

  if (!isToastVisible || !results) return null;

  const totalCount = results.reduce((sum, r) => sum + r.corrections.length, 0);
  if (totalCount === 0) return null;

  const handleClick = () => {
    openPanel();
    hideToast();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`absolute bottom-14 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-2xl px-5 py-3.5 shadow-xl transition-opacity duration-500 ${
        isFading ? "opacity-0" : "opacity-100"
      }`}
      style={{
        animation: "spellcheck-bounce 2s ease-in-out infinite",
        backgroundColor: "#7C3AED",
      }}
    >
      <div
        className="flex h-8 w-8 items-center justify-center rounded-full"
        style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
      >
        <SpellCheck className="h-4 w-4" style={{ color: "#fff" }} />
      </div>
      <div className="flex flex-col items-start gap-0.5">
        <span className="text-14-semibold" style={{ color: "#fff" }}>
          {totalCount}건의 맞춤법 오류를 발견했어요
        </span>
        <span className="text-12-regular" style={{ color: "rgba(255,255,255,0.85)" }}>
          우측 패널에서 하나씩 확인하고 수정할 수 있어요.
        </span>
      </div>
      <style>{`
        @keyframes spellcheck-bounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-4px); }
        }
      `}</style>
    </button>
  );
};

export default SpellCheckToast;
