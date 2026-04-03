/**
 * 저장된 캐릭터 CRUD — Cloudinary 업로드 + Supabase 저장/조회/삭제.
 */
import { supabase } from "@/shared/api/supabase";
import type { SavedCharacter, ChildInfo, ArtStyleId } from "../model/storybookTypes";

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLAUDINARY_CLOUD_NAME as string | undefined;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLAUDINARY_UPLOAD_PRESET as string | undefined;

const getCloudinaryUrl = (path: string): string => {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (CLOUDINARY_CLOUD_NAME) {
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${path}`;
  }
  return path;
};

const uploadCharacterToCloudinary = async (
  base64Data: string,
  userId: string,
): Promise<string> => {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error("Cloudinary is not configured");
  }
  const formData = new FormData();
  const publicId = crypto.randomUUID();
  formData.append("file", `data:image/png;base64,${base64Data}`);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", `muru-saved-characters/${userId}`);
  formData.append("public_id", publicId);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData },
  );
  if (!response.ok) throw new Error("Failed to upload character image");

  const payload = (await response.json()) as { public_id: string; format?: string };
  const imagePath = payload.format ? `${payload.public_id}.${payload.format}` : payload.public_id;
  return getCloudinaryUrl(imagePath);
};

export const fetchSavedCharacters = async (userId: string): Promise<SavedCharacter[]> => {
  const { data, error } = await supabase
    .from("user_saved_characters")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    userId: row.user_id as string,
    name: row.name as string,
    imageUrl: row.image_url as string,
    artStyleId: (row.art_style_id as ArtStyleId | null) ?? null,
    promptTemplate: (row.prompt_template as string | null) ?? null,
    childInfoSnapshot: (row.child_info_snapshot as ChildInfo | null) ?? null,
    createdAt: row.created_at as string,
  }));
};

export const saveCharacter = async ({
  userId,
  name,
  imageBase64,
  artStyleId,
  promptTemplate,
  childInfo,
}: {
  userId: string;
  name: string;
  imageBase64: string;
  artStyleId: ArtStyleId | null;
  promptTemplate: string | null;
  childInfo: ChildInfo | null;
}): Promise<SavedCharacter> => {
  const imageUrl = await uploadCharacterToCloudinary(imageBase64, userId);

  const { data, error } = await supabase
    .from("user_saved_characters")
    .insert({
      user_id: userId,
      name,
      image_url: imageUrl,
      art_style_id: artStyleId,
      prompt_template: promptTemplate,
      child_info_snapshot: childInfo,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    imageUrl: data.image_url,
    artStyleId: data.art_style_id ?? null,
    promptTemplate: data.prompt_template ?? null,
    childInfoSnapshot: data.child_info_snapshot ?? null,
    createdAt: data.created_at,
  };
};

export const deleteCharacter = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("user_saved_characters")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
};
