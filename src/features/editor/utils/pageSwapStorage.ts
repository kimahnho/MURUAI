import type { CanvasElement } from "../model/canvasTypes";

const DB_NAME = "muruai_editor";
const STORE_NAME = "page_elements";
const DB_VERSION = 1;

const openDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });

export const savePageElements = async (
  pageId: string,
  elements: CanvasElement[],
) => {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(elements, pageId);
    tx.oncomplete = () => {
      resolve();
      db.close();
    };
    tx.onerror = () => {
      reject(tx.error);
      db.close();
    };
  });
};

export const loadPageElements = async (pageId: string) => {
  const db = await openDb();
  return new Promise<CanvasElement[] | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(pageId);
    request.onsuccess = () => {
      resolve((request.result as CanvasElement[] | undefined) ?? null);
    };
    request.onerror = () => {
      reject(request.error);
    };
    tx.oncomplete = () => {
      db.close();
    };
  });
};

export const removePageElements = async (pageId: string) => {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(pageId);
    tx.oncomplete = () => {
      resolve();
      db.close();
    };
    tx.onerror = () => {
      reject(tx.error);
      db.close();
    };
  });
};

