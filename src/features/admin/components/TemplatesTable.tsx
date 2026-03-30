/**
 * 템플릿별 사용 통계를 표 형태로 표시하는 컴포넌트.
 */
import type { TemplateStat } from "../api/adminMetrics";
import { TEMPLATE_REGISTRY } from "@/features/editor/templates/templateRegistry";

const getTemplateLabel = (templateId: string) => {
  if (templateId in TEMPLATE_REGISTRY) {
    return TEMPLATE_REGISTRY[templateId as keyof typeof TEMPLATE_REGISTRY].label;
  }
  return templateId;
};

const TemplatesTable = ({
  title,
  templates,
  isLoading,
}: {
  title: string;
  templates: TemplateStat[];
  isLoading?: boolean;
}) => {
  if (isLoading && templates.length === 0) {
    return (
      <div className="flex h-56 w-full animate-pulse flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5" />
    );
  }

  const maxUsage = templates.reduce((max, t) => Math.max(max, t.usageCount), 0);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5">
      <span className="text-14-semibold text-black-90">{title}</span>
      {templates.length === 0 ? (
        <div className="flex h-36 items-center justify-center rounded-xl bg-black-5 text-13-regular text-black-70">
          템플릿 사용 데이터가 없습니다.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {templates.map((template, index) => {
            const percent =
              maxUsage > 0
                ? Math.round((template.usageCount / maxUsage) * 100)
                : 0;
            return (
              <div key={template.templateId} className="flex items-center gap-4">
                <span className="w-5 shrink-0 text-right text-13-bold text-black-70">
                  {index + 1}
                </span>
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-13-bold text-black-80">
                      {getTemplateLabel(template.templateId)}
                    </span>
                    <div className="flex items-center gap-3 text-12-regular text-black-70">
                      <span>{template.usageCount}회</span>
                      <span className="text-black-70">·</span>
                      <span>{template.docCount}건</span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-black-5">
                    <div
                      className="h-full rounded-full bg-primary-300 transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TemplatesTable;
