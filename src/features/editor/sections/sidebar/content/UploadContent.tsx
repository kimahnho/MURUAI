import {
  type DragEvent as ReactDragEvent,
  type RefObject,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { useUploadContentState } from "../hooks/useUploadContentState";

const setDragImageData = (
  event: ReactDragEvent<HTMLElement>,
  imageUrl: string
) => {
  event.dataTransfer.setData("application/x-muru-image", imageUrl);
  event.dataTransfer.setData("text/plain", imageUrl);
  event.dataTransfer.effectAllowed = "copy";
};

type UploadedFileItem = {
  id: string;
  image_path: string;
  created_at: string;
  url: string;
};

type UploadContentViewProps = {
  inputRef: RefObject<HTMLInputElement | null>;
  isLoading: boolean;
  isFetching: boolean;
  files: UploadedFileItem[];
  contextMenu: { id: string; x: number; y: number } | null;
  onUploadClick: () => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenContextMenu: (
    event: ReactMouseEvent<HTMLDivElement>,
    id: string
  ) => void;
  onCloseContextMenu: () => void;
  onDeleteUpload: (id: string) => void;
  onSelectImage: (url: string) => void;
};

const UploadContentView = ({
  inputRef,
  isLoading,
  isFetching,
  files,
  contextMenu,
  onUploadClick,
  onFileChange,
  onOpenContextMenu,
  onCloseContextMenu,
  onDeleteUpload,
  onSelectImage,
}: UploadContentViewProps) => (
  <div className="flex flex-col items-center pt-3 gap-6">
    <button
      type="button"
      onClick={onUploadClick}
      className="flex items-center justify-center w-full px-4 py-3 bg-[#5500ff]/40 rounded-xl transition hover:bg-[#5500ff]/50 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={isLoading}
    >
      <span className="flex text-title-16-semibold text-white-100">
        {isLoading ? "업로드 중..." : "파일 업로드"}
      </span>
    </button>
    <input
      ref={inputRef}
      type="file"
      accept=".jpg,.jpeg,.png"
      className="hidden"
      onChange={onFileChange}
    />

    <div className="flex flex-col w-full gap-3">
      <div className="flex items-center justify-start w-full">
        <span className="flex text-title-14-semibold">내가 업로드한 파일</span>
      </div>

      <div className="flex flex-col w-full flex-1 p-4">
        {isFetching ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-body-14-regular text-gray-400">
              업로드 된 파일을 가져오는 중입니다.
            </span>
          </div>
        ) : files.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-body-14-regular text-gray-400">
              아직 업로드된 파일이 없습니다.
            </span>
          </div>
        ) : (
          <div className="grid w-full grid-cols-2 gap-3">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex w-full items-center justify-center rounded-lg border border-black-25 p-3"
                onContextMenu={(event) => { onOpenContextMenu(event, file.id); }}
              >
                <img
                  src={file.url}
                  alt="Uploaded"
                  className="w-full h-auto object-contain"
                  draggable
                  onDragStart={(event) => { setDragImageData(event, file.url); }}
                  onClick={() => { onSelectImage(file.url); }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    {contextMenu && (
      <>
        <div
          className="fixed inset-0 z-40"
          onClick={onCloseContextMenu}
          aria-hidden="true"
        />
        <div
          className="fixed z-50 w-36 rounded-lg border border-black-25 bg-white-100 shadow-lg"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onContextMenu={(event) => { event.preventDefault(); }}
        >
          <button
            type="button"
            className="flex w-full items-center justify-start px-3 py-2 text-14-regular text-black-90 hover:bg-black-10"
            onClick={() => { onDeleteUpload(contextMenu.id); }}
          >
            삭제하기
          </button>
        </div>
      </>
    )}
  </div>
);

const UploadContent = () => {
  const {
    inputRef,
    isLoading,
    isFetching,
    files,
    contextMenu,
    onUploadClick,
    onFileChange,
    onOpenContextMenu,
    onCloseContextMenu,
    onDeleteUpload,
    onSelectImage,
  } = useUploadContentState();

  return (
    <UploadContentView
      inputRef={inputRef}
      isLoading={isLoading}
      isFetching={isFetching}
      files={files as UploadedFileItem[]}
      contextMenu={contextMenu}
      onUploadClick={onUploadClick}
      onFileChange={onFileChange}
      onOpenContextMenu={onOpenContextMenu}
      onCloseContextMenu={onCloseContextMenu}
      onDeleteUpload={onDeleteUpload}
      onSelectImage={onSelectImage}
    />
  );
};

export default UploadContent;
