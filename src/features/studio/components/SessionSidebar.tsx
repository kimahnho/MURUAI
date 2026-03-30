/**
 * 채팅 사이드바 — 이전 채팅 목록 + 새 채팅 버튼 + 삭제.
 */
import { Plus, MessageSquare, CheckCircle, Trash2 } from "lucide-react";
import type { TherapySession } from "../model/therapyTypes";
import { THERAPY_DOMAIN_LABELS } from "../model/therapyTypes";
import { cn } from "../lib/utils";

interface SessionSidebarProps {
  sessions: TherapySession[];
  activeSessionId?: string;
  onSelectSession: (session: TherapySession) => void;
  onDeleteSession: (sessionId: string) => void;
  onNewSession: () => void;
  isLoading?: boolean;
}

const SessionSidebar = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  onNewSession,
  isLoading,
}: SessionSidebarProps) => {
  const handleDelete = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    onDeleteSession(sessionId);
  };

  return (
    <div className="flex flex-col h-full border-r border-black-15 bg-black-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between shrink-0 px-4 py-3.5 border-b border-black-15">
        <span className="text-14-semibold text-black-90">채팅</span>
        <button
          type="button"
          onClick={onNewSession}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-12-semibold text-white-100 hover:bg-primary-700 transition cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          새 채팅
        </button>
      </div>

      {/* 채팅 목록 */}
      <div className="flex-1 overflow-auto px-2 py-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-13-regular text-black-40">
            불러오는 중...
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black-10">
              <MessageSquare className="h-5 w-5 text-black-30" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-14-semibold text-black-50">
                아직 채팅이 없어요
              </span>
              <span className="text-12-regular text-black-40">
                학습지를 요청하면 자동으로 저장돼요.
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {sessions.map((session) => {
              const isActive = session.id === activeSessionId;
              const isCompleted = session.status === "completed";
              const domainLabel = THERAPY_DOMAIN_LABELS[session.domain] ?? session.domain;
              return (
                <div
                  key={session.id}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition cursor-pointer",
                    isActive
                      ? "bg-white border border-primary-200 shadow-sm"
                      : "hover:bg-white",
                  )}
                  onClick={() => onSelectSession(session)}
                >
                  {/* 텍스트 */}
                  <div className="flex flex-col gap-px min-w-0 flex-1">
                    <span className={cn(
                      "truncate text-13-regular font-semibold",
                      isActive ? "text-primary" : "text-black-80",
                    )}>
                      {session.title ?? domainLabel}
                    </span>
                    <div className="flex items-center gap-1 text-12-regular text-black-40">
                      <span className="shrink-0">{domainLabel}</span>
                      <span>·</span>
                      <span className="truncate">{formatDate(session.createdAt)}</span>
                      {isCompleted && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-0.5 shrink-0 text-success-700">
                            <CheckCircle className="h-3 w-3" />
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 삭제 버튼 */}
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, session.id)}
                    className="flex shrink-0 items-center justify-center h-7 w-7 rounded-md opacity-0 group-hover:opacity-100 hover:bg-error-50 text-black-50 hover:text-error-700 transition cursor-pointer"
                    aria-label="채팅 삭제"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export default SessionSidebar;
