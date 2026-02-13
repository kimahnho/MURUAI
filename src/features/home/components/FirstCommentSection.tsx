import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/shared/store/useAuthStore";
import { useModalStore } from "@/shared/store/useModalStore";
import { useCreateDocumentNavigation } from "@/features/editor/hooks/useCreateDocumentNavigation";

const FirstCommentSection = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { openAuthModal } = useModalStore();
  const { isCreatingDoc, createAndOpenDocument } = useCreateDocumentNavigation();

  const handleMyMaterialsClick = () => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    navigate("/mydoc");
  };

  const handleStartDesignClick = async () => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    await createAndOpenDocument({
      replace: true,
      onUnauthorized: openAuthModal,
    });
  };

  return (
    <section className="flex flex-col w-full px-10 py-25">
      <div className="flex flex-col w-full gap-10 items-center justify-center">
        <div className="flex flex-col items-center justify-center">
          <span className="flex text-headline-42-bold items-center justify-center text-center">
            수업 준비를 무루아이와
            <br /> 함께 시작해볼까요?
          </span>
        </div>

        <div className="flex w-full items-center justify-center gap-4">
          <button
            onClick={handleStartDesignClick}
            disabled={isCreatingDoc}
            className="flex w-50 h-14 items-center justify-center rounded-xl bg-primary cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span className="text-18-title-semibold text-white-100">
              {isCreatingDoc ? "생성 중..." : "바로 만들어보기"}
            </span>
          </button>
          <button
            onClick={handleMyMaterialsClick}
            className="flex w-50 h-14 items-center justify-center border border-primary rounded-xl cursor-pointer"
          >
            <span className="text-18-title-semibold text-primary">
              내 학습자료
            </span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default FirstCommentSection;
