/**
 * 아동 Agent 카드 — 학습 상태 + 자동 적용 설정 표시
 */
import type { ChildVisualAgent } from "../model/types";
import { getAgentSummary } from "../ai/childAgent";

const STYLE_LABELS: Record<string, string> = {
  flat: "일러스트",
  pastel: "파스텔",
  realistic: "실사",
  high_contrast: "고대비",
  line_art: "선화",
};

const BG_LABELS: Record<string, string> = {
  none: "없음",
  simple: "단순",
  contextual: "상황",
};

const MATURITY_COLORS: Record<string, string> = {
  exploring: "bg-amber-50 text-amber-600",
  transitioning: "bg-blue-50 text-blue-600",
  confident: "bg-green-50 text-green-600",
};

interface AgentCardProps {
  agent: ChildVisualAgent;
  childName: string;
}

export function AgentCard({ agent, childName }: AgentCardProps) {
  const summary = getAgentSummary(agent);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      {/* 헤더 */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900">{childName}</h3>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${MATURITY_COLORS[summary.maturity]}`}>
          {summary.maturityLabel}
        </span>
      </div>

      {/* 자동 적용 설정 */}
      <div className="space-y-2">
        <Row label="그림체" value={STYLE_LABELS[agent.preferredStyle] ?? agent.preferredStyle} />
        <Row label="배경" value={BG_LABELS[agent.backgroundLevel] ?? agent.backgroundLevel} />
        <Row label="복잡도" value={"●".repeat(agent.optimalComplexity) + "○".repeat(5 - agent.optimalComplexity)} />
      </div>

      {/* 선호 테마 */}
      {summary.topThemes.length > 0 && (
        <div className="mt-3">
          <span className="text-xs text-gray-400">선호 테마</span>
          <div className="mt-1 flex flex-wrap gap-1">
            {summary.topThemes.map((t) => (
              <span key={t} className="rounded-full bg-violet-50 px-2 py-0.5 text-xs text-violet-600">{t}</span>
            ))}
          </div>
        </div>
      )}

      {/* 회피 테마 */}
      {agent.avoidThemes.length > 0 && (
        <div className="mt-2">
          <span className="text-xs text-gray-400">회피</span>
          <div className="mt-1 flex flex-wrap gap-1">
            {agent.avoidThemes.map((t) => (
              <span key={t} className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-400">{t}</span>
            ))}
          </div>
        </div>
      )}

      {/* 최근 학습 */}
      {summary.recentLearnings.length > 0 && (
        <div className="mt-3 border-t border-gray-100 pt-2">
          <span className="text-xs text-gray-400">최근 학습</span>
          {summary.recentLearnings.map((l, i) => (
            <p key={i} className="mt-0.5 text-xs text-gray-500">· {l}</p>
          ))}
        </div>
      )}

      {/* 통계 */}
      <div className="mt-3 border-t border-gray-100 pt-2 text-xs text-gray-400">
        <div className="flex justify-between">
          <span>생성 {agent.generationCount}회</span>
          <span>수정률 {Math.round(summary.modifyRate * 100)}%</span>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-800">{value}</span>
    </div>
  );
}
