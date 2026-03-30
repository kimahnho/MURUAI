/**
 * 아동 선택 버튼 — Popover + Command 기반.
 * 검색 가능한 아동 목록 + 새 아동 추가.
 */
import { useState, useEffect } from "react";
import { User, Plus, X, Check } from "lucide-react";
import { supabase } from "@/shared/api/supabase";
import { useAuthStore } from "@/shared/store/useAuthStore";
import { Popover, PopoverTrigger, PopoverContent } from "../ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandSeparator } from "../ui/command";
import AddStudentModal from "./AddStudentModal";
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
  const [open, setOpen] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const user = useAuthStore((s) => s.user);

  // 아동 목록 로드
  useEffect(() => {
    if (!open || !user?.id) return;
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
  }, [open, user?.id]);

  const handleSelect = (student: Student) => {
    onSelect(student);
    setOpen(false);
  };

  const handleClear = () => {
    onSelect(null);
    setOpen(false);
  };

  const handleStudentCreated = (student: Student) => {
    setStudents((prev) => [...prev, student]);
    onSelect(student);
    setOpen(false);
    setShowAddModal(false);
  };

  return (
    <>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-2 rounded-2xl px-3 py-2.5 text-14-regular transition cursor-pointer border",
            selectedStudent
              ? "bg-primary-50 text-primary border-primary-200 hover:bg-primary-100"
              : "bg-white text-black-60 border-black-25 hover:border-primary-200 hover:text-primary",
          )}
        >
          {selectedStudent ? (
            <>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary text-[11px] font-bold text-white-100">
                {selectedStudent.name[0]}
              </span>
              <span className="max-w-24 truncate font-semibold">{selectedStudent.name}</span>
            </>
          ) : (
            <>
              <User className="h-4 w-4" />
              <span>아동 선택</span>
            </>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent side="top" className="w-72 p-0">
        <Command>
          <CommandInput placeholder="아동 검색..." />
          <CommandList>
            <CommandEmpty>
              {isLoading ? "불러오는 중..." : "등록된 아동이 없어요"}
            </CommandEmpty>

            {/* 선택 해제 */}
            {selectedStudent && (
              <CommandGroup>
                <CommandItem onSelect={handleClear}>
                  <X className="h-3.5 w-3.5 text-black-40" />
                  <span className="text-black-50">선택 해제</span>
                </CommandItem>
              </CommandGroup>
            )}

            {selectedStudent && <CommandSeparator />}

            {/* 아동 목록 */}
            <CommandGroup>
              {students.map((student) => (
                <CommandItem
                  key={student.id}
                  value={student.name}
                  onSelect={() => handleSelect(student)}
                >
                  <span className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold",
                    selectedStudent?.id === student.id
                      ? "bg-primary text-white-100"
                      : "bg-black-10 text-black-50",
                  )}>
                    {student.name[0]}
                  </span>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-semibold truncate">{student.name}</span>
                    {student.significant && (
                      <span className="text-12-regular text-black-40 truncate">{student.significant}</span>
                    )}
                  </div>
                  {selectedStudent?.id === student.id && (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>

          <CommandSeparator />

          {/* 새 아동 추가 */}
          <div className="p-2">
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-13-regular text-primary hover:bg-primary-50 transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              새 아동 추가
            </button>
          </div>
        </Command>
      </PopoverContent>
    </Popover>

    {/* 아동 추가 모달 */}
    {showAddModal && (
      <AddStudentModal
        onClose={() => setShowAddModal(false)}
        onCreated={handleStudentCreated}
      />
    )}
    </>
  );
};

export default StudentPickerButton;
