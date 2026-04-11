/**
 * 업로드 사이드패널의 파일 선택/업로드 진행 상태를 관리하는 훅.
 */
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { supabase } from "@/shared/api/supabase";
import { getCloudinaryImageUrl } from "@/shared/api/cloudinaryUrl";
import { useToastStore } from "@/features/editor/store/toastStore";
import { useImageFillStore } from "@/features/editor/store/imageFillStore";
import { useUploadListStore } from "@/features/editor/store/useUploadListStore";
import { useImageUploadToCloudinary } from "./useImageUploadToCloudinary";

type UploadedFile = {
  id: string;
  image_path: string;
  created_at: string;
};

type UploadedFileItem = UploadedFile & { url: string };

export const useUploadContentState = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const showToast = useToastStore((state) => state.showToast);
  const requestImageFill = useImageFillStore(
    (state) => state.requestImageFill
  );
  const { uploadImage, isUploading: isLoading } =
    useImageUploadToCloudinary();
  const refetchTrigger = useUploadListStore((s) => s.refetchTrigger);
  const triggerRefetch = useUploadListStore((s) => s.triggerRefetch);
  const [contextMenu, setContextMenu] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        setUploadedFiles([]);
        return;
      }
      setIsFetching(true);
      const { data: uploads, error } = await supabase
        .from("user_uploads_n")
        .select("id,image_path,created_at")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      // 비동기 응답이 늦게 돌아온 경우 unmount 이후 setState를 막는다.
      if (!isMounted) return;
      if (error) {
        setIsFetching(false);
        showToast("업로드 목록을 불러오지 못했어요.");
        return;
      }
      setUploadedFiles((uploads as UploadedFile[]) ?? []);
      setIsFetching(false);
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [showToast, refetchTrigger]);

  const handleUploadClick = () => {
    inputRef.current?.click();
  };

  const handleDeleteUpload = async (id: string) => {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return;
    const { error } = await supabase
      .from("user_uploads_n")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", authData.user.id);
    if (error) {
      showToast("삭제하지 못했어요.");
      return;
    }
    setUploadedFiles((prev) => prev.filter((file) => file.id !== id));
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    // 같은 파일을 연속 업로드해도 change 이벤트가 다시 발생하도록 입력 값을 비운다.
    event.target.value = "";

    const url = await uploadImage(file);
    if (url) {
      triggerRefetch();
    }
  };

  const fileItems: UploadedFileItem[] = uploadedFiles.map((file) => ({
    ...file,
    url: getCloudinaryImageUrl(file.image_path),
  }));

  const handleOpenContextMenu = (
    event: ReactMouseEvent<HTMLDivElement>,
    id: string
  ) => {
    event.preventDefault();
    setContextMenu({
      id,
      x: event.clientX,
      y: event.clientY,
    });
  };

  const handleSelectImage = (url: string) => {
    const img = new Image();
    img.onload = () => {
      const maxSize = 300;
      const { naturalWidth, naturalHeight } = img;
      let width = naturalWidth;
      let height = naturalHeight;

      if (naturalWidth > maxSize || naturalHeight > maxSize) {
        if (naturalWidth >= naturalHeight) {
          width = maxSize;
          height = Math.round((naturalHeight / naturalWidth) * maxSize);
        } else {
          height = maxSize;
          width = Math.round((naturalWidth / naturalHeight) * maxSize);
        }
      }

      requestImageFill(url, undefined, { width, height }, { source: "upload" });
    };
    img.onerror = () => {
      // 원본 크기 판별에 실패해도 삽입 동작 자체는 막지 않는다.
      requestImageFill(url, undefined, undefined, { source: "upload" });
    };
    img.src = url;
  };

  return {
    inputRef: inputRef,
    isLoading,
    isFetching,
    files: fileItems,
    contextMenu,
    onUploadClick: handleUploadClick,
    onFileChange: handleFileChange,
    onOpenContextMenu: handleOpenContextMenu,
    onCloseContextMenu: () => { setContextMenu(null); },
    onDeleteUpload: handleDeleteUpload,
    onSelectImage: handleSelectImage,
  };
};
