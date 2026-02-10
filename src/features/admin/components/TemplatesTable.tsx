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
      <div className="flex h-56 w-full animate-pulse flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4" />
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className="text-14-semibold text-slate-800">{title}</span>
      {templates.length === 0 ? (
        <div className="flex h-36 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-13-regular text-slate-500">
          템플릿 사용 데이터가 없습니다.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-13-regular">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3">템플릿</th>
                <th className="px-4 py-3">사용 횟수</th>
                <th className="px-4 py-3">자료 수</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((template) => (
                <tr key={template.templateId} className="border-t border-slate-200">
                  <td className="px-4 py-3 text-slate-900">
                    {getTemplateLabel(template.templateId)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {template.usageCount}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {template.docCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TemplatesTable;
