import type { Page, CanvasDocument } from "../model/pageTypes";
import { resolvePagesForPersistence } from "./persistPages";
import { saveUserMadeVersion, updateUserMadeVersion } from "./userMadeExport";

export const buildPersistPayload = async (
  pages: Page[],
): Promise<CanvasDocument> => {
  const persistedPages = await resolvePagesForPersistence(pages);
  return { pages: persistedPages };
};

export const saveNewDocument = async ({
  userId,
  name,
  pages,
  canvasData,
}: {
  userId: string;
  name: string;
  pages?: Page[];
  canvasData?: CanvasDocument;
}): Promise<{ id: string }> => {
  const nextCanvasData = canvasData ?? (await buildPersistPayload(pages ?? []));
  return saveUserMadeVersion({
    userId,
    name,
    canvasData: nextCanvasData,
  });
};

export const saveExistingDocument = async ({
  docId,
  name,
  pages,
  canvasData,
}: {
  docId: string;
  name: string;
  pages?: Page[];
  canvasData?: CanvasDocument;
}): Promise<void> => {
  const nextCanvasData = canvasData ?? (await buildPersistPayload(pages ?? []));
  await updateUserMadeVersion({
    docId,
    name,
    canvasData: nextCanvasData,
  });
};
