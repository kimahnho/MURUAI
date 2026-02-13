/**
 * 템플릿 선택/적용 요청과 대상 정보를 관리하는 스토어 모듈.
 */
import { create } from "zustand";
import type { TemplateId } from "../templates/templateRegistry";

interface TemplateStore {
  selectedTemplate: TemplateId | null;
  selectedPageIndices: number[] | null;
  templateRequestId: number;
  previewTemplate: TemplateId | null;
  requestTemplate: (templateId: TemplateId, pageIndices?: number[]) => void;
  setSelectedTemplate: (templateId: TemplateId | null) => void;
  openPreview: (templateId: TemplateId) => void;
  closePreview: () => void;
}

export const useTemplateStore = create<TemplateStore>((set) => ({
  selectedTemplate: null,
  selectedPageIndices: null,
  templateRequestId: 0,
  previewTemplate: null,
  requestTemplate: (templateId, pageIndices) =>
    { set((state) => ({
      selectedTemplate: templateId,
      selectedPageIndices: pageIndices ?? null,
      templateRequestId: state.templateRequestId + 1,
    })); },
  setSelectedTemplate: (templateId) => { set({ selectedTemplate: templateId }); },
  openPreview: (templateId) => { set({ previewTemplate: templateId }); },
  closePreview: () => { set({ previewTemplate: null }); },
}));
