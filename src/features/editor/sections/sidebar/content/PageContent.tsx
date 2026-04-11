/**
 * 페이지 배경/번호 표시 설정을 편집하는 사이드바 패널.
 */
import { ImagePlus, Images, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { supabase } from "@/shared/api/supabase";
import { usePageSettingsStore } from "@/features/editor/store/pageSettingsStore";
import { useUploadListStore } from "@/features/editor/store/useUploadListStore";
import type {
  PageBackground,
  PageNumberFormat,
  PageNumberPosition,
  PageNumbering,
} from "@/features/editor/model/pageTypes";
import ColorPickerPopover from "@/features/editor/shared/ColorPickerPopover";
import { useImageUploadToCloudinary } from "../hooks/useImageUploadToCloudinary";
import { getCloudinaryImageUrl } from "@/shared/api/cloudinaryUrl";

type UploadedFile = {
  id: string;
  image_path: string;
  created_at: string;
};

const NUMBER_FORMAT_OPTIONS: Array<{ value: PageNumberFormat; label: string }> =
  [
    { value: "number", label: "1" },
    { value: "dash", label: "- 1 -" },
    { value: "korean", label: "페이지 1" },
    { value: "english", label: "Page 1" },
  ];

const NUMBER_POSITION_OPTIONS: Array<{
  value: PageNumberPosition;
  label: string;
}> = [
  { value: "bottom-left", label: "하단 좌측" },
  { value: "bottom-center", label: "하단 중앙" },
  { value: "bottom-right", label: "하단 우측" },
];

const PageContent = () => {
  const panel = usePageSettingsStore((state) => state.panel);
  const applySettings = usePageSettingsStore((state) => state.applySettings);
  const { uploadImage, isUploading } = useImageUploadToCloudinary();
  const refetchTrigger = useUploadListStore((state) => state.refetchTrigger);
  const triggerRefetch = useUploadListStore((state) => state.triggerRefetch);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isFetchingUploads, setIsFetchingUploads] = useState(false);

  const background = panel.background;
  const numbering = panel.numbering;
  const uploadedFileItems = useMemo(
    () =>
      uploadedFiles.map((file) => ({
        id: file.id,
        createdAt: file.created_at,
        imageUrl: getCloudinaryImageUrl(file.image_path),
      })),
    [uploadedFiles],
  );

  useEffect(() => {
    let mounted = true;
    const loadUploads = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        if (mounted) setUploadedFiles([]);
        return;
      }
      if (mounted) setIsFetchingUploads(true);
      const { data: uploads } = await supabase
        .from("user_uploads_n")
        .select("id,image_path,created_at")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (!mounted) return;
      setUploadedFiles((uploads as UploadedFile[]) ?? []);
      setIsFetchingUploads(false);
    };
    loadUploads();
    return () => {
      mounted = false;
    };
  }, [refetchTrigger]);

  const updateBackground = (nextBackground: PageBackground) => {
    applySettings({ background: nextBackground });
  };

  const updateNumbering = (nextNumbering: PageNumbering) => {
    applySettings({ numbering: nextNumbering });
  };

  const handleBackgroundTypeChange = (type: "none" | "color" | "image") => {
    if (type === "none") {
      updateBackground({ type: "none" });
      return;
    }
    if (type === "color") {
      const color = background.type === "color" ? background.color : "#FFFFFF";
      updateBackground({ type: "color", color });
      return;
    }
    if (background.type === "image") {
      updateBackground(background);
      return;
    }
    updateBackground({ type: "image", imageUrl: "" });
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    const imageUrl = await uploadImage(file);
    if (!imageUrl) return;
    triggerRefetch();
    updateBackground({ type: "image", imageUrl });
  };

  return (
    <div className="flex h-full w-full flex-col gap-6">
      <section className="flex flex-col gap-3">
        <div className="text-14-semibold text-black-90">페이지 배경</div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { key: "none", label: "없음" },
            { key: "color", label: "색상" },
            { key: "image", label: "이미지" },
          ].map((option) => {
            const isActive = background.type === option.key;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() =>
                  handleBackgroundTypeChange(
                    option.key as "none" | "color" | "image",
                  )
                }
                className={`rounded-lg border px-2 py-2 text-12-semibold transition ${
                  isActive
                    ? "border-primary bg-primary-100 text-primary"
                    : "border-black-25 text-black-70 hover:bg-black-5"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {background.type === "color" && (
          <div className="flex items-center gap-2">
            <span className="text-13-regular text-black-70">배경 색상</span>
            <ColorPickerPopover
              value={background.color}
              onChange={(value) => {
                updateBackground({ type: "color", color: value });
              }}
              ariaLabel="페이지 배경 색상"
            />
          </div>
        )}

        {background.type === "image" && (
          <div className="flex flex-col gap-2">
            {!background.imageUrl ? (
              <>
                {/* 이미지 미선택: 업로드 버튼 + 파일 목록 */}
                <label className="flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-black-30 text-13-semibold text-black-80 hover:border-primary hover:text-primary aria-disabled:cursor-not-allowed aria-disabled:opacity-60">
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImagePlus className="h-4 w-4" />
                  )}
                  <span>배경 이미지 업로드</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    disabled={isUploading}
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
                <UploadedFileList
                  items={uploadedFileItems}
                  isFetching={isFetchingUploads}
                  activeImageUrl={null}
                  onSelect={(imageUrl) => { updateBackground({ type: "image", imageUrl }); }}
                />
              </>
            ) : (
              <>
                {/* 배경 이미지 크기/위치 */}
                <div className="rounded-lg border border-black-15 bg-black-5 p-2.5 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-12-semibold text-black-50 shrink-0 w-7">크기</span>
                    <EditableNumberInput
                      value={Math.round((background.scale ?? 1) * 100)}
                      min={10}
                      max={100}
                      onChange={(v) => { updateBackground({ ...background, scale: v / 100 }); }}
                      className="w-16 rounded border border-black-25 bg-white-100 px-2 py-1 text-13-regular text-black-90 text-center outline-none focus:border-primary"
                    />
                    <span className="text-12-semibold text-black-50 shrink-0">%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-12-semibold text-black-50 shrink-0 w-7">위치</span>
                    <span className="text-12-regular text-black-40 shrink-0">가로</span>
                    <EditableNumberInput
                      value={background.offsetX ?? 0}
                      onChange={(v) => { updateBackground({ ...background, offsetX: v }); }}
                      className="w-14 rounded border border-black-25 bg-white-100 px-2 py-1 text-13-regular text-black-90 text-center outline-none focus:border-primary"
                    />
                    <span className="text-12-regular text-black-40 shrink-0">세로</span>
                    <EditableNumberInput
                      value={background.offsetY ?? 0}
                      onChange={(v) => { updateBackground({ ...background, offsetY: v }); }}
                      className="w-14 rounded border border-black-25 bg-white-100 px-2 py-1 text-13-regular text-black-90 text-center outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {/* 다른 이미지 선택하기 */}
                <ImageChangePicker
                  items={uploadedFileItems}
                  isFetching={isFetchingUploads}
                  isUploading={isUploading}
                  activeImageUrl={background.imageUrl}
                  onSelect={(imageUrl) => { updateBackground({ type: "image", imageUrl }); }}
                  onUpload={handleImageUpload}
                />
              </>
            )}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="text-14-semibold text-black-90">페이지 넘버링</div>
          <button
            type="button"
            onClick={() => {
              updateNumbering({ ...numbering, enabled: !numbering.enabled });
            }}
            className={`rounded-full border px-3 py-1 text-12-semibold transition ${
              numbering.enabled
                ? "border-primary bg-primary-100 text-primary"
                : "border-black-25 text-black-60"
            }`}
          >
            {numbering.enabled ? "켜짐" : "꺼짐"}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {NUMBER_FORMAT_OPTIONS.map((option) => {
            const isActive = numbering.format === option.value;
            return (
              <button
                key={option.value}
                type="button"
                disabled={!numbering.enabled}
                onClick={() => {
                  updateNumbering({ ...numbering, format: option.value });
                }}
                className={`rounded-lg border px-2 py-2 text-12-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  isActive
                    ? "border-primary bg-primary-100 text-primary"
                    : "border-black-25 text-black-70 hover:bg-black-5"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {NUMBER_POSITION_OPTIONS.map((option) => {
            const isActive = numbering.position === option.value;
            return (
              <button
                key={option.value}
                type="button"
                disabled={!numbering.enabled}
                onClick={() => {
                  updateNumbering({ ...numbering, position: option.value });
                }}
                className={`rounded-lg border px-2 py-2 text-11-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  isActive
                    ? "border-primary bg-primary-100 text-primary"
                    : "border-black-25 text-black-70 hover:bg-black-5"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {numbering.enabled && (
          <div className="flex items-center gap-2">
            <span className="text-13-regular text-black-70 shrink-0">시작 페이지</span>
            <input
              type="number"
              min={1}
              max={999}
              value={numbering.startPage ?? 1}
              onChange={(e) => {
                const val = Math.max(1, Math.min(999, Number(e.target.value) || 1));
                updateNumbering({ ...numbering, startPage: val });
              }}
              className="w-16 rounded-lg border border-black-25 px-2 py-1 text-13-regular text-black-90 text-center outline-none focus:border-primary"
            />
            <span className="text-13-regular text-black-50">페이지부터</span>
          </div>
        )}
      </section>
    </div>
  );
};

export default PageContent;

// ─── 서브 컴포넌트 ───

// 포커스 시 자유 편집, 빈 값으로 blur 시 이전 값 복원
const EditableNumberInput = ({
  value,
  onChange,
  min,
  max,
  step = 10,
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}) => {
  const [draft, setDraft] = useState<string>(String(value));
  const [isFocused, setIsFocused] = useState(false);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (!isFocused) {
      setDraft(String(value));
      prevValueRef.current = value;
    }
  }, [value, isFocused]);

  return (
    <input
      type="number"
      min={min}
      max={max}
      step={step}
      value={isFocused ? draft : value}
      onFocus={(e) => {
        setIsFocused(true);
        prevValueRef.current = value;
        e.target.select();
      }}
      onChange={(e) => {
        const raw = e.target.value;
        setDraft(raw);
        const num = Number(raw);
        if (raw !== "" && !Number.isNaN(num)) {
          const clamped = Math.max(min ?? -Infinity, Math.min(max ?? Infinity, num));
          onChange(clamped);
        }
      }}
      onBlur={() => {
        setIsFocused(false);
        if (draft === "" || Number.isNaN(Number(draft))) {
          setDraft(String(prevValueRef.current));
          onChange(prevValueRef.current);
        }
      }}
      className={className}
    />
  );
};

type FileItem = { id: string; imageUrl: string };

// 이미지 미선택 시 표시되는 업로드 파일 목록
const UploadedFileList = ({
  items,
  isFetching,
  activeImageUrl,
  onSelect,
}: {
  items: FileItem[];
  isFetching: boolean;
  activeImageUrl: string | null;
  onSelect: (imageUrl: string) => void;
}) => (
  <div className="rounded-lg border border-black-25 p-2">
    <div className="mb-2 text-12-semibold text-black-70">내가 업로드한 파일</div>
    <div className="h-80 overflow-y-auto">
      {isFetching ? (
        <div className="flex h-full items-center justify-center text-12-regular text-black-50">
          업로드 목록을 불러오는 중입니다.
        </div>
      ) : items.length === 0 ? (
        <div className="flex h-full items-center justify-center rounded border border-dashed border-black-20 text-12-regular text-black-50">
          업로드된 파일이 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {items.map((file) => (
            <button
              key={file.id}
              type="button"
              onClick={() => { onSelect(file.imageUrl); }}
              className={`overflow-hidden rounded-lg border transition ${
                activeImageUrl === file.imageUrl
                  ? "border-primary ring-1 ring-primary-300"
                  : "border-black-20 hover:border-black-40"
              }`}
              aria-label="업로드 이미지 배경으로 선택"
            >
              <img src={file.imageUrl} alt="업로드 이미지" className="h-20 w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  </div>
);

// 이미지 선택 후 "다른 이미지 선택하기" 토글 버튼 + 파일 목록
const ImageChangePicker = ({
  items,
  isFetching,
  isUploading,
  activeImageUrl,
  onSelect,
  onUpload,
}: {
  items: FileItem[];
  isFetching: boolean;
  isUploading: boolean;
  activeImageUrl: string;
  onSelect: (imageUrl: string) => void;
  onUpload: (e: ChangeEvent<HTMLInputElement>) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => { setIsOpen((v) => !v); }}
        className="flex h-9 items-center justify-center gap-2 rounded-lg border border-black-30 text-13-semibold text-black-80 hover:border-primary hover:text-primary"
      >
        <Images className="h-4 w-4" />
        <span>{isOpen ? "닫기" : "다른 이미지 선택하기"}</span>
      </button>
      {isOpen && (
        <div className="flex flex-col gap-2">
          <label className="flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-black-30 text-13-semibold text-black-70 hover:border-primary hover:text-primary aria-disabled:cursor-not-allowed aria-disabled:opacity-60">
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
            <span>새 이미지 업로드</span>
            <input
              type="file"
              accept="image/jpeg,image/png"
              disabled={isUploading}
              onChange={onUpload}
              className="hidden"
            />
          </label>
          <UploadedFileList
            items={items}
            isFetching={isFetching}
            activeImageUrl={activeImageUrl}
            onSelect={onSelect}
          />
        </div>
      )}
    </div>
  );
};
