/**
 * 요소 이동/회전/크기 변환의 수학 계산 유틸을 제공하는 모듈.
 */
type Transform = {
  flipX?: boolean;
  flipY?: boolean;
  rotation?: number;
};

type TransformContext = {
  elementId: string;
  readOnly: boolean;
  locked: boolean;
  getTransform: () => Transform;
  updateElement: (id: string, updates: Record<string, unknown>) => void;
};

const ROTATION_STEP = 90;

export const createFlipXHandler = ({
  elementId,
  readOnly,
  locked,
  getTransform,
  updateElement,
}: TransformContext): (() => void) | undefined =>
  readOnly || locked
    ? undefined
    : () => {
        // flip 토글은 기존 transform 필드를 유지한 채 해당 축 플래그만 반전한다.
        const t = getTransform();
        updateElement(elementId, {
          transform: { ...t, flipX: !t.flipX },
        });
      };

export const createFlipYHandler = ({
  elementId,
  readOnly,
  locked,
  getTransform,
  updateElement,
}: TransformContext): (() => void) | undefined =>
  readOnly || locked
    ? undefined
    : () => {
        const t = getTransform();
        updateElement(elementId, {
          transform: { ...t, flipY: !t.flipY },
        });
      };

export const createRotateCWHandler = ({
  elementId,
  readOnly,
  locked,
  getTransform,
  updateElement,
}: TransformContext): (() => void) | undefined =>
  readOnly || locked
    ? undefined
    : () => {
        const t = getTransform();
        // 90도 단위 회전으로 툴바 버튼 동작을 예측 가능하게 고정한다.
        const newRotation = ((t.rotation ?? 0) + ROTATION_STEP + 360) % 360;
        updateElement(elementId, {
          transform: { ...t, rotation: newRotation },
        });
      };

export const createRotateCCWHandler = ({
  elementId,
  readOnly,
  locked,
  getTransform,
  updateElement,
}: TransformContext): (() => void) | undefined =>
  readOnly || locked
    ? undefined
    : () => {
        const t = getTransform();
        const newRotation = ((t.rotation ?? 0) - ROTATION_STEP + 360) % 360;
        updateElement(elementId, {
          transform: { ...t, rotation: newRotation },
        });
      };
