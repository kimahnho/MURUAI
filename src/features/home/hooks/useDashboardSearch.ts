/**
 * 대시보드 통합 검색 훅 — 자료명(supabase), 아동(스토어), 템플릿(정적) 검색.
 * 300ms 디바운스 적용.
 */
import { useState, useEffect, useRef } from "react";

import { supabase } from "@/shared/api/supabase";
import { useAuthStore } from "@/shared/store/useAuthStore";
import { useStudentStore } from "../store/useStudentStore";

const TEMPLATE_LIST = [
  { id: "emotionInference", label: "감정추론 활동" },
  { id: "vocabularyLearningCard", label: "어휘 학습 카드" },
  { id: "findItem", label: "사물 찾기" },
  { id: "visualSchedule", label: "시각적 스케줄표" },
  { id: "fiveSpaceWritingNote", label: "5칸 원고지" },
  { id: "tenSpaceWritingNote", label: "10칸 원고지" },
  { id: "dictationPractice", label: "받아쓰기 연습장" },
  { id: "emotionWorksheet", label: "감정 워크시트" },
  { id: "emotionDiary", label: "감정 일기장" },
  { id: "labelSheet3x8", label: "이름표" },
  { id: "trainTemplate", label: "기차 템플릿" },
] as const;

export interface SearchResultItem {
  type: "document" | "student" | "template";
  id: string;
  label: string;
  sub?: string;
}

export const useDashboardSearch = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const students = useStudentStore((s) => s.students);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      const q = query.trim().toLowerCase();
      const items: SearchResultItem[] = [];

      // 아동 검색 (클라이언트 필터)
      const matchedStudents = students
        .filter((s) => s.name.toLowerCase().includes(q))
        .slice(0, 3);
      for (const s of matchedStudents) {
        const age = new Date().getFullYear() - parseInt(s.birth_year);
        items.push({
          type: "student",
          id: s.id!,
          label: s.name,
          sub: `만 ${age}세`,
        });
      }

      // 템플릿 검색 (정적 필터)
      const matchedTemplates = TEMPLATE_LIST.filter((t) =>
        t.label.toLowerCase().includes(q),
      ).slice(0, 3);
      for (const t of matchedTemplates) {
        items.push({ type: "template", id: t.id, label: t.label });
      }

      // 자료 검색 (supabase)
      if (isAuthenticated) {
        const { data } = await supabase
          .from("user_made_n")
          .select("id, name, updated_at")
          .is("deleted_at", null)
          .ilike("name", `%${q}%`)
          .order("updated_at", { ascending: false })
          .limit(5);

        if (data) {
          for (const doc of data) {
            items.push({
              type: "document",
              id: doc.id,
              label: doc.name || "제목 없음",
              sub: doc.updated_at
                ? new Date(doc.updated_at).toLocaleDateString("ko-KR")
                : undefined,
            });
          }
        }
      }

      setResults(items);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timerRef.current);
  }, [query, students, isAuthenticated]);

  return { query, setQuery, results, isSearching };
};
