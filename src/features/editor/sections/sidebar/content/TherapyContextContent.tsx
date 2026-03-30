/**
 * 에디터 사이드바 치료 컨텍스트 패널 — 읽기 전용 정보 + 채팅 복귀.
 * role === "tester" || "admin" 일 때만 사이드바에 표시된다.
 */
import { ArrowLeft, Target, Lightbulb, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";

const TherapyContextContent = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-4">
      {/* 학습지 정보 */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <BookOpen className="h-4 w-4 text-primary shrink-0" />
          <span className="text-13-bold text-black-80">학습지 정보</span>
        </div>
        <p className="text-13-regular text-black-60">
          AI 스튜디오에서 생성된 학습지를 편집하고 있어요.
        </p>
      </div>

      {/* 치료 목표 */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <Target className="h-4 w-4 text-primary shrink-0" />
          <span className="text-13-bold text-black-80">치료 목표</span>
        </div>
        <p className="text-13-regular text-black-60">
          스튜디오에서 아동을 선택하면 치료 목표가 표시됩니다.
        </p>
      </div>

      {/* AI 코칭 팁 */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <Lightbulb className="h-4 w-4 text-warning shrink-0" />
          <span className="text-13-bold text-black-80">AI 코칭 팁</span>
        </div>
        <div className="rounded-lg bg-warning-50 border border-warning-100 px-3 py-2.5">
          <p className="text-13-regular text-warning-700">
            학습지를 완성한 후 PDF로 내보내면 인쇄용 자료로 활용할 수 있어요.
          </p>
        </div>
      </div>

      {/* 채팅으로 돌아가기 */}
      <button
        type="button"
        onClick={() => navigate("/studio")}
        className="flex items-center justify-center gap-1.5 rounded-xl border border-primary-200 bg-primary-50 px-4 py-2.5 text-14-semibold text-primary hover:bg-primary-100 transition cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        스튜디오로 돌아가기
      </button>
    </div>
  );
};

export default TherapyContextContent;
