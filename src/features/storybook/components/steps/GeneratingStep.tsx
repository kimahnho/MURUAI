/**
 * 5단계: 생성 중 — 바운싱 도트 애니메이션 + 안내 문구 3초 순환.
 */
import { useState, useEffect } from "react";

import {
  GENERATING_MESSAGES,
  GENERATING_MESSAGE_INTERVAL_MS,
} from "../../model/storybookTypes";
import { useStorybookWizardStore } from "../../store/useStorybookWizardStore";

const GeneratingStep = () => {
  const imageProgress = useStorybookWizardStore((s) => s.imageProgress);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % GENERATING_MESSAGES.length);
    }, GENERATING_MESSAGE_INTERVAL_MS);
    return () => { clearInterval(timer); };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-10">
      {/* 바운싱 도트 */}
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-3 w-3 rounded-full bg-primary"
            style={{
              animation: "bounce 1.4s ease-in-out infinite",
              animationDelay: `${i * 0.16}s`,
            }}
          />
        ))}
      </div>

      {/* 진행률 */}
      {imageProgress && (
        <p className="text-14-semibold text-primary">
          이미지 생성 중 ({imageProgress.current}/{imageProgress.total})
        </p>
      )}

      {/* 안내 문구 */}
      <p className="text-16-semibold text-black-80 text-center">
        {GENERATING_MESSAGES[messageIndex]}
      </p>

      {/* 경고 */}
      <p className="text-13-medium text-red-500">
        페이지 창을 닫지 마세요
      </p>

      {/* 바운스 키프레임 */}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default GeneratingStep;
