/**
 * 아동 선택 버튼 — 입력 바 좌측에 배치.
 * 클릭 시 드롭다운으로 아동 목록 표시 + 검색.
 */
import { useState, useEffect, useRef } from "react";
import { User, Search, X, Plus } from "lucide-react";
import { supabase } from "@/shared/api/supabase";
import { useAuthStore } from "@/shared/store/useAuthStore";
import { cn } from "../lib/utils";

interface Student {
  id: string;
  name: string;
  birth_year?: string;
  gender?: string;
  significant?: string;
}

interface StudentPickerButtonProps {
  selectedStudent: Student | null;
  onSelect: (student: Student | null) => void;
}

const StudentPickerButton = ({ selectedStudent, onSelect }: StudentPickerButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore((s) => s.user);

  // 아동 목록 로드
  useEffect(() => {
    if (!isOpen || !user?.id) return;
    setIsLoading(true);
    supabase
      .from("students_n")
      .select("id, name, birth_year, gender, significant")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .order("name")
      .then(({ data }) => {
        setStudents(data ?? []);
        setIsLoading(false);
      });
  }, [isOpen, user?.id]);

  // 바깥 클릭 닫기
  useEffect(() => {
    if (!isOpen) return;
    const handle = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [isOpen]);

  const filtered = search
    ? students.filter((s) => s.name.includes(search))
    : students;

  return (
    <div ref={dropdownRef} className="relative shrink-0 self-center">
      {/* 버튼 */}
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className={cn(
          "flex items-center gap-1.5 rounded-2xl px-3 py-2.5 text-13-regular font-semibold transition cursor-pointer border",
          selectedStudent
            ? "bg-primary-50 text-primary border-primary-200 hover:bg-primary-100"
            : "bg-white text-black-60 border-black-25 hover:border-primary-200 hover:text-primary",
        )}
      >
        {selectedStudent ? (
          <>
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary text-[10px] font-bold text-white-100">
              {selectedStudent.name[0]}
            </span>
            <span className="max-w-20 truncate">{selectedStudent.name}</span>
          </>
        ) : (
          <>
            <User className="h-4 w-4" />
            <span className="whitespace-nowrap">아동</span>
          </>
        )}
      </button>

      {/* 드롭다운 */}
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-56 rounded-xl border border-black-15 bg-white shadow-xl z-50">
          {/* 검색 */}
          <div className="flex items-center gap-2 border-b border-black-10 px-3 py-2">
            <Search className="h-3.5 w-3.5 text-black-40 shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="아동 검색"
              className="flex-1 text-13-regular text-black-80 placeholder:text-black-40 outline-none bg-transparent"
              autoFocus
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} className="cursor-pointer">
                <X className="h-3 w-3 text-black-40" />
              </button>
            )}
          </div>

          {/* 선택 해제 */}
          {selectedStudent && (
            <button
              type="button"
              onClick={() => { onSelect(null); setIsOpen(false); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-13-regular text-black-50 hover:bg-black-5 transition cursor-pointer border-b border-black-10"
            >
              <X className="h-3.5 w-3.5" />
              선택 해제
            </button>
          )}

          {/* 목록 */}
          <div className="max-h-48 overflow-auto py-1">
            {isLoading ? (
              <div className="px-3 py-4 text-center text-12-regular text-black-40">불러오는 중...</div>
            ) : filtered.length === 0 && !isAdding ? (
              <div className="px-3 py-4 text-center text-12-regular text-black-40">
                {search ? "검색 결과가 없어요" : "등록된 아동이 없어요"}
              </div>
            ) : (
              filtered.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => { onSelect(student); setIsOpen(false); setSearch(""); }}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3 py-2 text-left transition cursor-pointer",
                    selectedStudent?.id === student.id
                      ? "bg-primary-50"
                      : "hover:bg-black-5",
                  )}
                >
                  <span className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold",
                    selectedStudent?.id === student.id
                      ? "bg-primary text-white-100"
                      : "bg-black-10 text-black-50",
                  )}>
                    {student.name[0]}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-13-regular font-semibold text-black-80 truncate">{student.name}</span>
                    {student.significant && (
                      <span className="text-12-regular text-black-40 truncate">{student.significant}</span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* 새 아동 추가 */}
          <div className="border-t border-black-10">
            {isAdding ? (
              <form
                className="flex items-center gap-2 px-3 py-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newName.trim() || !user?.id) return;
                  const { data } = await supabase
                    .from("students_n")
                    .insert({ user_id: user.id, name: newName.trim() })
                    .select("id, name")
                    .single();
                  if (data) {
                    const created = { id: data.id, name: data.name };
                    setStudents((prev) => [...prev, created]);
                    onSelect(created);
                    setIsOpen(false);
                  }
                  setNewName("");
                  setIsAdding(false);
                }}
              >
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="아동 이름"
                  className="flex-1 text-13-regular text-black-80 placeholder:text-black-40 outline-none bg-transparent"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!newName.trim()}
                  className="text-12-semibold text-primary disabled:text-black-30 cursor-pointer"
                >
                  추가
                </button>
                <button
                  type="button"
                  onClick={() => { setIsAdding(false); setNewName(""); }}
                  className="cursor-pointer"
                >
                  <X className="h-3 w-3 text-black-40" />
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setIsAdding(true)}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-13-regular text-primary hover:bg-primary-50 transition cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                새 아동 추가
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentPickerButton;
