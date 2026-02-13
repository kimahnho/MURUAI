/**
 * 스왑 페이지 요소를 저장소에 저장/복원하는 I/O 모듈.
 */
import type { CanvasElement } from "../model/canvasTypes";

const DB_NAME = "muruai_editor";
const STORE_NAME = "page_elements";
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

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

const getDb = () => {
  if (!dbPromise) {
    // 연결 객체를 재사용해 스왑 빈도가 높은 구간에서 IndexedDB open 비용을 줄인다.
    dbPromise = openDb();
  }
  return dbPromise;
};

export const savePageElements = async (
  pageId: string,
  elements: CanvasElement[],
) => {
  const db = await getDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(elements, pageId);
    tx.oncomplete = () => {
      resolve();
    };
    tx.onerror = () => {
      reject(tx.error);
    };
  });
};

export const loadPageElements = async (pageId: string) => {
  const db = await getDb();
  return new Promise<CanvasElement[] | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(pageId);
    request.onsuccess = () => {
      resolve((request.result as CanvasElement[] | undefined) ?? null);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
};

export const loadPageElementsBatch = async (pageIds: string[]) => {
  if (pageIds.length === 0) return new Map<string, CanvasElement[] | null>();
  const db = await getDb();
  return new Promise<Map<string, CanvasElement[] | null>>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const result = new Map<string, CanvasElement[] | null>();

    pageIds.forEach((pageId) => {
      const request = store.get(pageId);
      request.onsuccess = () => {
        result.set(pageId, (request.result as CanvasElement[] | undefined) ?? null);
      };
      request.onerror = () => {
        reject(request.error);
      };
    });

    tx.oncomplete = () => {
      // 트랜잭션 단위 완료 시점에 결과를 반환해 배치 로드의 일관성을 보장한다.
      resolve(result);
    };
    tx.onerror = () => {
      reject(tx.error);
    };
  });
};

export const savePageElementsBatch = async (
  entries: Array<{ pageId: string; elements: CanvasElement[] }>,
) => {
  if (entries.length === 0) return;
  const db = await getDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    entries.forEach((entry) => {
      store.put(entry.elements, entry.pageId);
    });
    tx.oncomplete = () => {
      resolve();
    };
    tx.onerror = () => {
      reject(tx.error);
    };
  });
};

export const removePageElements = async (pageId: string) => {
  const db = await getDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(pageId);
    tx.oncomplete = () => {
      resolve();
    };
    tx.onerror = () => {
      reject(tx.error);
    };
  });
};
