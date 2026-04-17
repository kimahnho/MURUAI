/**
 * Step 2 · 주인공 확인 — 좌측 주인공 카드 + 우측 기획서 카드를 한 화면에 병합.
 *
 * 좌측: AI 생성 주인공 이미지 + 재생성/업로드/저장/커스텀 프롬프트/서브캐릭터
 * 우측: AI 기획서 1개 + 인라인 편집 + "다른 버전 보기"로 2번째 기획서 접근
 */
import { useRef, useState } from "react";
import {
  Bookmark,
  Check,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";

import { supabase } from "@/shared/api/supabase";
import { aiPipelineLogger } from "@/shared/utils/aiPipelineLogger";
import { captureSentryError } from "@/shared/utils/sentryUtils";

import { useStorybookWizardStore } from "../../store/useStorybookWizardStore";
import { saveCharacter } from "../../api/savedCharacterApi";
import { generateSubCharacterReference } from "../../ai/generateCharacterReference";

const AnchorStep = () => {
  return (
    <div className="flex flex-col md:flex-row gap-6 min-h-0">
      <div className="md:w-64 shrink-0">
        <CharacterPane />
      </div>
      <div className="flex-1 min-w-0">
        <ProposalPane />
      </div>
    </div>
  );
};

// ─── 좌측: 주인공 ───

const CharacterPane = () => {
  const referenceImageBase64 = useStorybookWizardStore(
    (s) => s.formData.referenceImageBase64,
  );
  const artStyle = useStorybookWizardStore((s) => s.formData.artStyle);
  const customPromptTemplate = useStorybookWizardStore(
    (s) => s.formData.customPromptTemplate,
  );
  const childInfo = useStorybookWizardStore((s) => s.formData.childInfo);
  const isLoading = useStorybookWizardStore((s) => s.isLoading);
  const error = useStorybookWizardStore((s) => s.error);
  const generateCharacterRef = useStorybookWizardStore(
    (s) => s.generateCharacterRef,
  );
  const setReferenceImageBase64 = useStorybookWizardStore(
    (s) => s.setReferenceImageBase64,
  );
  const characterPrompt = useStorybookWizardStore(
    (s) => s.formData.characterPrompt,
  );
  const setCharacterPrompt = useStorybookWizardStore((s) => s.setCharacterPrompt);
  const clearSavedCharacter = useStorybookWizardStore((s) => s.clearSavedCharacter);
  const pageCount = useStorybookWizardStore((s) => s.formData.pageCount);

  const [localPrompt, setLocalPrompt] = useState(characterPrompt ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRegenerate = async () => {
    setCharacterPrompt(localPrompt);
    setSaveSuccess(false);
    setLocalError(null);
    // 저장된 캐릭터 기반이면 해제 후 새로 AI 생성
    clearSavedCharacter();
    setIsRegenerating(true);
    try {
      aiPipelineLogger.addStep("character_regenerate", { customPrompt: localPrompt });
      await generateCharacterRef();
    } catch (err) {
      captureSentryError(err, "스토리북 주인공 재생성");
      setLocalError("주인공 재생성에 실패했어요. 다시 시도해 주세요.");
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      setReferenceImageBase64(base64);
      setSaveSuccess(false);
      setLocalError(null);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSaveCharacter = async () => {
    if (!referenceImageBase64) return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    setIsSaving(true);
    try {
      await saveCharacter({
        userId: data.user.id,
        name: "캐릭터",
        imageBase64: referenceImageBase64,
        artStyleId: artStyle ?? null,
        promptTemplate: artStyle === "custom" ? (customPromptTemplate ?? null) : null,
        childInfo: childInfo ?? null,
      });
      setSaveSuccess(true);
    } catch {
      // 저장 실패 — 조용히 무시
    } finally {
      setIsSaving(false);
    }
  };

  const busy = isLoading || isRegenerating;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* 이미지 영역 */}
      <div className="relative w-full aspect-square rounded-2xl border-2 border-black-20 overflow-hidden bg-black-5 flex items-center justify-center">
        {busy ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-13-regular text-black-50">
              주인공을 그리고 있어요...
            </span>
          </div>
        ) : referenceImageBase64 ? (
          <img
            src={`data:image/png;base64,${referenceImageBase64}`}
            alt="주인공 레퍼런스"
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-13-regular text-black-40 text-center px-4">
            {localError ?? error ?? "주인공 이미지가 없어요"}
          </span>
        )}
      </div>

      {/* 안내 */}
      <p className="text-12-regular text-black-50 text-center">
        이 주인공으로 {" "}
        <span className="text-primary text-12-semibold">{pageCount}장 전체</span>를 그려요
      </p>

      {/* 커스텀 프롬프트 */}
      <textarea
        value={localPrompt}
        onChange={(e) => { setLocalPrompt(e.target.value); }}
        placeholder="원하는 캐릭터 특징 (예: 안경, 빨간 모자)"
        disabled={busy}
        rows={2}
        className="w-full resize-none rounded-lg border border-black-20 px-3 py-2 text-12-regular placeholder:text-black-30 focus:border-primary focus:outline-none disabled:opacity-50"
      />

      {/* 버튼 */}
      {!busy && (
        <div className="flex flex-col gap-1.5 w-full">
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => { void handleRegenerate(); }}
              className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-primary px-3 py-2 text-12-semibold text-primary transition hover:bg-primary-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              다시 생성
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-black-30 px-3 py-2 text-12-semibold text-black-60 transition hover:bg-black-5"
            >
              <Upload className="h-3.5 w-3.5" />
              업로드
            </button>
          </div>
          {referenceImageBase64 && !saveSuccess && (
            <button
              type="button"
              onClick={() => { void handleSaveCharacter(); }}
              disabled={isSaving}
              className="flex items-center justify-center gap-1 rounded-lg border border-warning-500 bg-warning-50 px-3 py-2 text-12-semibold text-warning-700 transition hover:bg-warning-100 disabled:opacity-50"
            >
              <Bookmark className="h-3.5 w-3.5" />
              {isSaving ? "저장 중..." : "캐릭터 저장"}
            </button>
          )}
          {saveSuccess && (
            <span className="flex items-center justify-center gap-1 rounded-lg border border-success-500 bg-success-50 px-3 py-2 text-12-semibold text-success-700">
              저장 완료
            </span>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* 서브 캐릭터 */}
      <SubCharacterSection />
    </div>
  );
};

// ─── 서브 캐릭터 ───

const SubCharacterSection = () => {
  const subCharacters = useStorybookWizardStore(
    (s) => s.formData.manualSubCharacters ?? [],
  );
  const mainRef = useStorybookWizardStore((s) => s.formData.referenceImageBase64);
  const addSubCharacter = useStorybookWizardStore((s) => s.addSubCharacter);
  const removeSubCharacter = useStorybookWizardStore((s) => s.removeSubCharacter);
  const updateSubCharacter = useStorybookWizardStore((s) => s.updateSubCharacter);
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const [errorIds, setErrorIds] = useState<Set<string>>(new Set());

  const handleAdd = () => {
    addSubCharacter({
      id: crypto.randomUUID(),
      name: "",
      appearance: "",
    });
  };
  const handleFileUpload = (id: string, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      updateSubCharacter(id, { imageBase64: base64 });
      setErrorIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    };
    reader.readAsDataURL(file);
  };
  const handleGenerate = async (id: string, appearance: string) => {
    if (!mainRef || !appearance.trim()) return;
    setGeneratingIds((prev) => new Set(prev).add(id));
    setErrorIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    try {
      const imageBase64 = await generateSubCharacterReference(mainRef, appearance, "");
      updateSubCharacter(id, { imageBase64 });
    } catch (error) {
      captureSentryError(error, "서브캐릭터 수동 생성");
      setErrorIds((prev) => new Set(prev).add(id));
    } finally {
      setGeneratingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  return (
    <div className="w-full flex flex-col gap-2 mt-2 pt-3 border-t border-black-10">
      <div className="flex items-center justify-between">
        <span className="text-12-semibold text-black-70">서브 캐릭터 (선택)</span>
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-1 text-11-semibold text-primary hover:text-primary-700 transition"
        >
          <Plus className="h-3 w-3" />
          추가
        </button>
      </div>
      {subCharacters.length === 0 && (
        <p className="text-11-regular text-black-40">
          친구, 가족 등 함께 등장할 캐릭터를 추가해요.
        </p>
      )}
      {subCharacters.map((sc) => {
        const isGenerating = generatingIds.has(sc.id);
        const hasError = errorIds.has(sc.id);
        return (
          <div
            key={sc.id}
            className="flex gap-2 items-start p-2 rounded-lg border border-black-15 bg-black-5"
          >
            <div className="flex flex-col items-center gap-1 shrink-0">
              <label className="flex items-center justify-center w-12 h-12 rounded-lg border border-dashed border-black-25 bg-white-100 cursor-pointer overflow-hidden">
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : sc.imageBase64 ? (
                  <img
                    src={`data:image/png;base64,${sc.imageBase64}`}
                    alt={sc.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Upload className="h-3.5 w-3.5 text-black-30" />
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(sc.id, f);
                    e.target.value = "";
                  }}
                  className="hidden"
                  disabled={isGenerating}
                />
              </label>
              {mainRef && (
                <button
                  type="button"
                  onClick={() => { void handleGenerate(sc.id, sc.appearance); }}
                  disabled={isGenerating || !sc.appearance.trim()}
                  className="flex items-center gap-0.5 text-11-regular text-primary hover:text-primary-700 disabled:text-black-30 transition"
                >
                  <RefreshCw className={`h-2.5 w-2.5 ${isGenerating ? "animate-spin" : ""}`} />
                  {sc.imageBase64 ? "다시" : "AI"}
                </button>
              )}
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <input
                type="text"
                value={sc.name}
                onChange={(e) => updateSubCharacter(sc.id, { name: e.target.value })}
                placeholder="이름"
                className="w-full rounded border border-black-20 px-2 py-1 text-11-regular focus:border-primary focus:outline-none"
              />
              <input
                type="text"
                value={sc.appearance}
                onChange={(e) => updateSubCharacter(sc.id, { appearance: e.target.value })}
                placeholder="외모 (예: 갈색 머리, 안경)"
                className="w-full rounded border border-black-20 px-2 py-1 text-11-regular focus:border-primary focus:outline-none"
              />
              {hasError && (
                <span className="text-11-regular text-error-700">
                  생성 실패 — 다시 시도해 주세요
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => removeSubCharacter(sc.id)}
              className="shrink-0 p-1 rounded text-black-30 hover:text-error-700 transition"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

// ─── 우측: 기획서 ───

const ProposalPane = () => {
  const proposals = useStorybookWizardStore((s) => s.formData.proposals);
  const selectedId = useStorybookWizardStore((s) => s.formData.selectedProposalId);
  const editedProposal = useStorybookWizardStore((s) => s.formData.editedProposal);
  const selectProposal = useStorybookWizardStore((s) => s.selectProposal);
  const updateProposalPage = useStorybookWizardStore((s) => s.updateProposalPage);

  const [isEditing, setIsEditing] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);

  const primary = editedProposal;
  const alternatives = proposals.filter((p) => p.id !== selectedId);
  const hasAlternatives = alternatives.length > 0;
  const hasUserEdits = useHasUserEdits();

  if (!primary) {
    return (
      <div className="flex items-center justify-center h-full py-8">
        <span className="text-13-regular text-black-40">기획서를 준비하고 있어요...</span>
      </div>
    );
  }

  const handlePickAlternative = (id: string) => {
    if (hasUserEdits) {
      const ok = window.confirm(
        "다른 기획서를 선택하면 지금까지 수정한 내용이 초기화돼요. 진행할까요?",
      );
      if (!ok) return;
    }
    selectProposal(id);
    setShowAlternatives(false);
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* 제목 + 요약 */}
      <div className="rounded-lg border border-primary bg-primary-50 p-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <span className="text-15-semibold text-black-90">{primary.title}</span>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary shrink-0">
            <Check className="h-3 w-3 text-white-100" />
          </span>
        </div>
        <p className="text-13-regular text-black-70">{primary.summary}</p>
      </div>

      {/* 컨트롤 */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => { setIsEditing((v) => !v); }}
          className="flex items-center gap-1 text-12-semibold text-primary hover:text-primary-700 transition"
        >
          <Pencil className="h-3 w-3" />
          {isEditing ? "수정 닫기" : "직접 수정하기"}
        </button>
        {hasAlternatives && (
          <button
            type="button"
            onClick={() => { setShowAlternatives((v) => !v); }}
            className="text-12-semibold text-black-60 hover:text-primary transition"
          >
            {showAlternatives ? "다른 버전 닫기" : "다른 버전 보기"}
          </button>
        )}
      </div>

      {/* 인라인 편집 */}
      {isEditing && (
        <div className="flex flex-col gap-2 rounded-lg border border-black-15 bg-black-5 p-3 overflow-y-auto">
          {primary.pages.map((page) => (
            <div key={page.pageNumber} className="flex flex-col gap-0.5">
              <span className="text-11-medium text-black-50">{page.pageNumber}페이지</span>
              <textarea
                value={page.textContent}
                onChange={(e) => {
                  updateProposalPage(primary.id, page.pageNumber, e.target.value);
                }}
                onBlur={(e) => {
                  const original = proposals
                    .find((p) => p.id === primary.id)
                    ?.pages.find((pg) => pg.pageNumber === page.pageNumber)?.textContent ?? "";
                  const edited = e.target.value;
                  if (edited !== original) {
                    aiPipelineLogger.addStep("proposal_edit", {
                      pageIndex: page.pageNumber - 1,
                      originalText: original,
                      editedText: edited,
                    });
                  }
                }}
                rows={2}
                className="w-full resize-none rounded border border-black-20 px-2 py-1.5 text-12-regular focus:border-primary focus:outline-none"
              />
            </div>
          ))}
        </div>
      )}

      {/* 다른 버전 */}
      {showAlternatives && (
        <div className="flex flex-col gap-2">
          <span className="text-12-semibold text-black-60">다른 기획서</span>
          {alternatives.map((alt) => (
            <button
              key={alt.id}
              type="button"
              onClick={() => { handlePickAlternative(alt.id); }}
              className="flex flex-col gap-1 rounded-lg border border-black-25 p-3 text-left transition hover:border-primary hover:bg-primary-50"
            >
              <span className="text-13-semibold text-black-90">{alt.title}</span>
              <span className="text-12-regular text-black-60">{alt.summary}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// editedProposal과 원본 proposals 중 selected 버전을 비교해 사용자 수정 여부 판단
const useHasUserEdits = (): boolean => {
  return useStorybookWizardStore((s) => {
    const edited = s.formData.editedProposal;
    if (!edited) return false;
    const original = s.formData.proposals.find((p) => p.id === edited.id);
    if (!original) return false;
    return edited.pages.some((page, i) => {
      const orig = original.pages[i];
      return !orig || page.textContent !== orig.textContent;
    });
  });
};

export default AnchorStep;
