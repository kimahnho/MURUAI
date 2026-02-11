import { useTemplateStore } from "../store/templateStore";
import { useOrientationStore } from "../store/orientationStore";
import { useToastStore } from "../store/toastStore";
import { TEMPLATE_REGISTRY } from "../templates/templateRegistry";

export const useOrientationControl = () => {
  const orientation = useOrientationStore((state) => state.orientation);
  const setOrientation = useOrientationStore((state) => state.setOrientation);
  const selectedTemplate = useTemplateStore((state) => state.selectedTemplate);
  const showToast = useToastStore((state) => state.showToast);

  const activeTemplate = selectedTemplate
    ? TEMPLATE_REGISTRY[selectedTemplate]
    : null;
  const isVerticalLocked = activeTemplate?.orientation === "vertical-only";
  const isHorizontalLocked = activeTemplate?.orientation === "horizontal-only";
  const effectiveOrientation = isVerticalLocked
    ? "vertical"
    : isHorizontalLocked
      ? "horizontal"
      : orientation;
  const isHorizontalDisabled = isVerticalLocked;
  const isVerticalDisabled = isHorizontalLocked;

  const handleOrientationChange = (next: "horizontal" | "vertical") => {
    if (next === "horizontal" && isVerticalLocked) {
      showToast("해당 템플릿은 세로 버전만 지원합니다.");
      return;
    }
    if (next === "vertical" && isHorizontalLocked) {
      showToast("해당 템플릿은 가로 버전만 지원합니다.");
      return;
    }
    setOrientation(next);
  };

  return {
    effectiveOrientation,
    setOrientation,
    isHorizontalDisabled,
    isVerticalDisabled,
    handleOrientationChange,
  };
};
