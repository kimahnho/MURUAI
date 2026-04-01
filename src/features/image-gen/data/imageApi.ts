/**
 * 이미지 생성 이력 — localStorage CRUD (Supabase 전환 대비)
 */
import type { GeneratedImage } from "../model/types";

const HISTORY_KEY = "imagegen_history";
const MAX_HISTORY = 200;

function loadHistory(): GeneratedImage[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveHistory(images: GeneratedImage[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(images.slice(-MAX_HISTORY)));
  } catch { /* quota */ }
}

/** 생성 이력 추가 */
export function addToHistory(image: GeneratedImage): void {
  const history = loadHistory();
  history.push(image);
  saveHistory(history);
}

/** 아동별 생성 이력 조회 */
export function getHistoryByChild(childId: string, limit = 20): GeneratedImage[] {
  return loadHistory()
    .filter((img) => img.childId === childId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

/** 전체 생성 이력 조회 */
export function getAllHistory(limit = 50): GeneratedImage[] {
  return loadHistory()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

/** 피드백 업데이트 */
export function updateFeedback(imageId: string, feedback: "liked" | "disliked" | "modified"): void {
  const history = loadHistory();
  const idx = history.findIndex((img) => img.id === imageId);
  if (idx >= 0) {
    history[idx].feedback = feedback;
    saveHistory(history);
  }
}
