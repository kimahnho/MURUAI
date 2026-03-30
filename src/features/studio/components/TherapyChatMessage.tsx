/**
 * 채팅 메시지 버블 — AI/사용자 메시지를 렌더링한다.
 * safetyAlert 타입은 빨간 배경, sessionSet은 카드 그리드로 표시.
 */
import { useState } from "react";
import { Bot, User, AlertTriangle, ChevronDown } from "lucide-react";
import type { ChatMessage, SessionSet } from "../model/therapyTypes";
import { WORKSHEET_TYPE_LABELS, DIFFICULTY_LABELS } from "../model/therapyConstants";
import { Avatar } from "../ui/avatar";
import { cn } from "../lib/utils";

interface TherapyChatMessageProps {
  message: ChatMessage;
  onApproveSessionSet?: (set: SessionSet) => void;
}

const TherapyChatMessage = ({ message, onApproveSessionSet }: TherapyChatMessageProps) => {
  const isUser = message.role === "user";
  const isSafety = message.type === "safetyAlert";
  const isError = message.type === "error";
  const sessionSet = message.metadata?.sessionSet;

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      {/* 아바타 */}
      <Avatar size="sm" className={cn(
        "shrink-0 mt-0.5",
        isUser ? "bg-primary-100 text-primary" : "bg-black-10 text-black-60",
        isSafety && "bg-error-100 text-error-700",
      )}>
        {isSafety ? <AlertTriangle className="h-4 w-4" /> :
         isUser ? <User className="h-4 w-4" /> :
         <Bot className="h-4 w-4" />}
      </Avatar>

      {/* 메시지 본문 */}
      <div className={cn(
        "flex flex-col gap-2 max-w-lg min-w-0",
        isUser && "items-end",
      )}>
        {/* 텍스트 버블 */}
        <div className={cn(
          "rounded-2xl px-4 py-3 text-14-regular whitespace-pre-wrap wrap-break-word",
          isUser && "bg-primary-50 text-black-90",
          !isUser && !isSafety && !isError && "bg-black-5 text-black-80",
          isSafety && "bg-error-50 border border-error-100 text-error-700",
          isError && "bg-warning-50 border border-warning-100 text-warning-700",
        )}>
          {message.content}
        </div>

        {/* 세션 세트 카드 (AI 메시지에만) */}
        {sessionSet && !isUser && (
          <div className="flex flex-col gap-2 w-full">
            <div className="grid grid-cols-1 gap-2">
              {sessionSet.sheets.map((sheet, i) => (
                <div
                  key={`${sessionSet.id}-${i}`}
                  className="flex items-start gap-3 rounded-xl border border-black-20 bg-white px-3 py-2.5"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-12-semibold text-primary">
                    {i + 1}
                  </span>
                  <SheetCardContent sheet={sheet} />
                </div>
              ))}
            </div>
            {onApproveSessionSet && (
              <button
                type="button"
                onClick={() => onApproveSessionSet(sessionSet)}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-14-semibold text-white-100 hover:bg-primary-700 transition cursor-pointer"
              >
                학습지 확인하기
              </button>
            )}
          </div>
        )}

        {/* 타임스탬프 */}
        <span className="text-12-regular text-black-40">
          {formatTime(message.createdAt)}
        </span>
      </div>
    </div>
  );
};

// 카드 내부 — 기본: 제목 + 태그, 클릭: description 아코디언
const SheetCardContent = ({ sheet }: { sheet: { title: string; worksheetType: string; difficulty: string; itemCount: number; description?: string } }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
      <button
        type="button"
        onClick={() => sheet.description && setIsOpen((o) => !o)}
        className={cn("flex items-center gap-1 text-left", sheet.description && "cursor-pointer")}
      >
        <span className="text-13-bold text-black-80 truncate flex-1">{sheet.title}</span>
        {sheet.description && (
          <ChevronDown className={cn("h-3 w-3 shrink-0 text-black-30 transition", isOpen && "rotate-180")} />
        )}
      </button>
      <span className="text-12-regular text-black-50">
        {WORKSHEET_TYPE_LABELS[sheet.worksheetType] ?? sheet.worksheetType}
        {" · "}
        {DIFFICULTY_LABELS[sheet.difficulty] ?? sheet.difficulty}
        {" · "}
        {sheet.itemCount}개
      </span>
      {isOpen && sheet.description && (
        <p className="text-12-regular text-black-50 mt-1">
          {sheet.description}
        </p>
      )}
    </div>
  );
};

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default TherapyChatMessage;
