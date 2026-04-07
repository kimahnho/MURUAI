/**
 * 커스텀 그림체 CRUD — Supabase 저장/조회/삭제.
 */
import { supabase } from "@/shared/api/supabase";

export interface CustomArtStyle {
  id: string;
  userId: string;
  styleName: string;
  promptTemplate: string;
  previewImageUrl: string | null;
  createdAt: string;
}

export const fetchCustomArtStyles = async (userId: string): Promise<CustomArtStyle[]> => {
  const { data, error } = await supabase
    .from("user_custom_art_styles")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    userId: row.user_id as string,
    styleName: row.style_name as string,
    promptTemplate: row.prompt_template as string,
    previewImageUrl: (row.preview_image_url as string | null) ?? null,
    createdAt: row.created_at as string,
  }));
};

export const saveCustomArtStyle = async ({
  userId,
  styleName,
  promptTemplate,
  previewImageUrl,
}: {
  userId: string;
  styleName: string;
  promptTemplate: string;
  previewImageUrl?: string;
}): Promise<CustomArtStyle> => {
  const { data, error } = await supabase
    .from("user_custom_art_styles")
    .insert({
      user_id: userId,
      style_name: styleName,
      prompt_template: promptTemplate,
      preview_image_url: previewImageUrl ?? null,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    userId: data.user_id,
    styleName: data.style_name,
    promptTemplate: data.prompt_template,
    previewImageUrl: data.preview_image_url ?? null,
    createdAt: data.created_at,
  };
};

export const deleteCustomArtStyle = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("user_custom_art_styles")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
};
