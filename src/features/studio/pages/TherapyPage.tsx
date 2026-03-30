/**
 * /studio/:chatId? 메인 페이지 — AI 채팅 + 세션 사이드바.
 * chatId가 있으면 DB에서 세션 복원, 없으면 빈 상태(새 채팅).
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/shared/store/useAuthStore";
import { useTherapyStore } from "../store/useTherapyStore";
import { getUserSessions } from "../data/therapyService";
import { startSession, loadSessionMessages, archiveSession } from "../data/sessionService";
import { captureSentryError } from "@/shared/utils/sentryUtils";
import { detectDomain } from "../ai/domainDetection";
import TherapyChatPanel from "../components/TherapyChatPanel";
import SessionSidebar from "../components/SessionSidebar";
import type { SessionSet, TherapySession } from "../model/therapyTypes";
import WorkspacePage from "./WorkspacePage";

interface TherapyPageProps {
  chatId?: string;
}

const TherapyPage = ({ chatId }: TherapyPageProps) => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const sessions = useTherapyStore((s) => s.sessions);
  const activeSession = useTherapyStore((s) => s.activeSession);
  const selectedStudent = useTherapyStore((s) => s.selectedStudent);

  // 사이드바 아동 필터 (아동 선택과 별도)
  const [filterStudentId, setFilterStudentId] = useState<string | null>(null);
  const filteredSessions = filterStudentId
    ? sessions.filter((s) => s.studentId === filterStudentId)
    : sessions;

  const setSessions = useTherapyStore((s) => s.setSessions);
  const setActiveSession = useTherapyStore((s) => s.setActiveSession);
  const setMessages = useTherapyStore((s) => s.setMessages);
  const setCurrentDomain = useTherapyStore((s) => s.setCurrentDomain);
  const setSessionSet = useTherapyStore((s) => s.setSessionSet);
  const reset = useTherapyStore((s) => s.reset);

  // workspace 모달 + body 스크롤 잠금
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);

  useEffect(() => {
    if (isWorkspaceOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isWorkspaceOpen]);

  const sessionIdRef = useRef<string | null>(null);

  // 세션 목록 로드
  useEffect(() => {
    if (!user?.id) return;
    getUserSessions(user.id)
      .then(setSessions)
      .catch((err) => captureSentryError(err, "TherapyPage 세션 목록 로드"));
  }, [user?.id, setSessions]);

  // chatId 변경 시 세션 로드 또는 빈 상태로 전환
  useEffect(() => {
    if (!chatId) {
      // /studio — 빈 상태 (activeSession이 이미 있으면 초기화)
      if (activeSession) {
        reset();
        sessionIdRef.current = null;
      }
      return;
    }

    // 이미 같은 세션이 로드되어 있으면 스킵
    if (activeSession?.id === chatId) return;

    // DB에서 세션 + 메시지 로드
    const loadSession = async () => {
      // 먼저 sessions 목록에서 찾기
      const session = sessions.find((s) => s.id === chatId);
      if (!session) {
        // 목록에 없으면 잘못된 ID → /studio로 리다이렉트
        navigate("/studio", { replace: true });
        return;
      }

      setActiveSession(session);
      setCurrentDomain(session.domain);
      setMessages([]);
      sessionIdRef.current = chatId;

      // DB에 저장된 sheets 복원 (session_data.sheets)
      if (session.sheets && session.sheets.length > 0) {
        setSessionSet({
          id: crypto.randomUUID(),
          domain: session.domain,
          sheets: session.sheets,
        });
      } else {
        setSessionSet(null);
      }

      try {
        const restored = await loadSessionMessages(chatId);
        setMessages(restored);
      } catch (err) {
        captureSentryError(err, "TherapyPage chatId 세션 복원");
        navigate("/studio", { replace: true });
      }
    };

    void loadSession();
  }, [chatId]);

  // 첫 메시지 → 세션 생성 (navigate는 하지 않음 — AI 응답 후 TherapyChatPanel에서 처리)
  const handleFirstMessage = async (text: string): Promise<string | undefined> => {
    if (!user?.id) return undefined;
    const domain = detectDomain(text).primary;
    const studentId = (selectedStudent as unknown as Record<string, unknown>)?.id as string | undefined;
    try {
      const id = await startSession(user.id, domain, studentId, text);
      const newSession: TherapySession = {
        id,
        userId: user.id,
        studentId,
        title: text,
        domain,
        status: "active",
        messages: [],
        createdAt: new Date().toISOString(),
      };
      setActiveSession(newSession);
      setSessions([newSession, ...sessions]);
      setCurrentDomain(domain);
      sessionIdRef.current = id;
      return id;
    } catch (err) {
      captureSentryError(err, "TherapyPage 자동 세션 생성");
      return undefined;
    }
  };

  // 학습지 확정 → workspace 모달 열기
  const handleApproveSessionSet = (_set: SessionSet) => {
    setIsWorkspaceOpen(true);
  };

  // 사이드바 세션 클릭 → URL 변경 (useEffect에서 로드)
  const handleSelectSession = (session: TherapySession) => {
    navigate(`/studio/${session.id}`);
  };

  // 세션 삭제
  const handleDeleteSession = async (sessionId: string) => {
    try {
      await archiveSession(sessionId);
      setSessions(sessions.filter((s) => s.id !== sessionId));
      if (activeSession?.id === sessionId) {
        navigate("/studio", { replace: true });
      }
    } catch (err) {
      captureSentryError(err, "TherapyPage 세션 삭제");
    }
  };

  // 새 채팅 → /studio로 이동
  const handleNewSession = () => {
    navigate("/studio");
  };

  return (
    <>
      <div className="flex h-[calc(100vh-56px)] md:h-[calc(100vh-72px)]">
        {/* 사이드바 (좌측, 데스크탑만) */}
        <div className="hidden lg:block w-72 shrink-0 h-full">
          <SessionSidebar
            sessions={filteredSessions}
            activeSessionId={activeSession?.id}
            onSelectSession={handleSelectSession}
            onDeleteSession={handleDeleteSession}
            onNewSession={handleNewSession}
            onFilterByStudent={setFilterStudentId}
            filterStudentId={filterStudentId}
          />
        </div>

        {/* 채팅 패널 */}
        <div className="flex-1 min-w-0">
          <TherapyChatPanel
            onApproveSessionSet={handleApproveSessionSet}
            onFirstMessage={handleFirstMessage}
            onNavigateToChat={(id) => navigate(`/studio/${id}`, { replace: true })}
            userId={user?.id}
            activeSessionId={activeSession?.id}
          />
        </div>
      </div>

      {/* Workspace 풀스크린 모달 */}
      {isWorkspaceOpen && (
        <WorkspacePage onClose={() => setIsWorkspaceOpen(false)} />
      )}
    </>
  );
};

export default TherapyPage;
