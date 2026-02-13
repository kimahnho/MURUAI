/**
 * 문서 저장 payload 구성과 신규/기존 저장 API 호출을 공통화한 모듈.
 */
import type { Page, CanvasDocument } from "../model/pageTypes";
import { resolvePagesForPersistence } from "./persistPages";
import { saveUserMadeVersion, updateUserMadeVersion } from "./userMadeExport";

/**
 * 저장 전에 페이지를 영속화 가능한 구조로 정규화한다.
 */
export const buildPersistPayload = async (
  pages: Page[],
): Promise<CanvasDocument> => {
  const persistedPages = await resolvePagesForPersistence(pages);
  return { pages: persistedPages };
};

/**
 * 신규 문서를 저장한다.
 * pages 또는 canvasData 중 하나를 받아 동일한 저장 경로를 공유한다.
 */
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

/**
 * 기존 문서를 같은 포맷으로 갱신 저장한다.
 */
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
