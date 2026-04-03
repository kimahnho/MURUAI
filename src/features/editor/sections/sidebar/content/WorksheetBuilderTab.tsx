/**
 * 템플릿 탭의 "직접 만들기" 서브탭 내용.
 * 학습자료 컴포넌트 목록 + 모달 편집기 오픈.
 */
import { useState } from "react";
import { Pencil } from "lucide-react";

import Button from "@/shared/ui/Button";
import type { Page } from "@/features/editor/model/pageTypes";
import WorksheetBuilderModal from "./WorksheetBuilderModal";

interface WorksheetBuilderTabProps {
  onInsertPage: (page: Page) => void;
}

const COMPONENT_LIST = [
  { icon: "📝", name: "지시문", desc: "제목 + 활동 안내" },
  { icon: "⭐", name: "보상 트래커", desc: "스티커/별 칸" },
  { icon: "💬", name: "안내 가이드", desc: "캐릭터 + 설명" },
  { icon: "🔄", name: "변환 쌍", desc: "간→갈 발음 변화" },
  { icon: "🔁", name: "반복 연습", desc: "바바바 교대운동" },
  { icon: "✋", name: "문장 선택", desc: "[A / B] 골라 읽기" },
  { icon: "⊞", name: "그리드", desc: "단어카드/이미지 배열" },
  { icon: "🅰️", name: "아웃라인 제목", desc: "속 빈 큰 글씨 + 색칠" },
  { icon: "✏️", name: "쓰기 연습", desc: "음절 격자 따라쓰기" },
  { icon: "🎨", name: "색칠 영역", desc: "라인아트 색칠 활동" },
  { icon: "📊", name: "체크리스트", desc: "어휘 목록/기록표" },
];

const WorksheetBuilderTab = ({ onInsertPage }: WorksheetBuilderTabProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4 p-3">
      {/* CTA */}
      <Button
        variant="primary"
        fullWidth
        icon={<Pencil className="h-4 w-4" />}
        onClick={() => setIsModalOpen(true)}
      >
        학습자료 만들기
      </Button>

      {/* Component list (read-only preview) */}
      <div>
        <p className="text-11-semibold text-black-55 uppercase tracking-wider mb-2">
          사용 가능한 컴포넌트
        </p>
        <div className="flex flex-col gap-1">
          {COMPONENT_LIST.map((item) => (
            <div
              key={item.name}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-black-5 cursor-default"
            >
              <span className="text-base shrink-0">{item.icon}</span>
              <div className="min-w-0">
                <div className="text-12-semibold truncate">{item.name}</div>
                <div className="text-[10px] text-black-55 truncate">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      <WorksheetBuilderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onApply={onInsertPage}
      />
    </div>
  );
};

export default WorksheetBuilderTab;
