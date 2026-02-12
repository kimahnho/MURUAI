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
