import { supabase } from "@/shared/api/supabase";

export const trackActivityEvent = async (
  eventType: "login" | "session_start" | "active",
  userId?: string | null
) => {
  const resolvedUserId = userId ?? (await supabase.auth.getUser()).data.user?.id;
  if (!resolvedUserId) return;

  const { error } = await supabase.from("activity_events").insert({
    user_id: resolvedUserId,
    event_type: eventType,
  });

  if (error) {
    console.warn("activity_events insert failed", error);
  }
};

export const trackDownloadEvent = async (
  userId?: string | null,
  userMadeId?: string | null
) => {
  const resolvedUserId = userId ?? (await supabase.auth.getUser()).data.user?.id;
  if (!resolvedUserId) return;

  const { error } = await supabase.from("download_events").insert({
    user_id: resolvedUserId,
    user_made_id: userMadeId ?? null,
  });

  if (error) {
    console.warn("download_events insert failed", error);
  }
};

export const trackTemplateUsageEvent = async (
  templateId: string,
  userId?: string | null,
  userMadeId?: string | null
) => {
  const resolvedUserId = userId ?? (await supabase.auth.getUser()).data.user?.id;
  if (!resolvedUserId) return;

  const { error } = await supabase.from("template_usage_events").insert({
    user_id: resolvedUserId,
    user_made_id: userMadeId ?? null,
    template_id: templateId,
  });

  if (error) {
    console.warn("template_usage_events insert failed", error);
  }
};

export const trackImageUsageEvent = async (
  imageUrl: string,
  source: string,
  label?: string | null,
  userMadeId?: string | null,
  userId?: string | null
) => {
  const resolvedUserId =
    userId ?? (await supabase.auth.getUser()).data.user?.id;
  if (!resolvedUserId) return;

  // url() 래퍼 제거하여 순수 URL만 저장
  const cleanUrl = imageUrl.startsWith("url(")
    ? imageUrl.slice(4, -1)
    : imageUrl;

  const { error } = await supabase.from("image_usage_events").insert({
    user_id: resolvedUserId,
    image_url: cleanUrl,
    source,
    label: label ?? null,
    user_made_id: userMadeId ?? null,
  });

  if (error) {
    console.warn("image_usage_events insert failed", error);
  }
};

/** 외부 링크 클릭 이벤트를 기록한다. 비차단. */
export const trackLinkClickEvent = async (
  linkName: string,
  userId?: string | null,
) => {
  const resolvedUserId = userId ?? (await supabase.auth.getUser()).data.user?.id;
  if (!resolvedUserId) return;

  const { error } = await supabase.from("link_click_events").insert({
    user_id: resolvedUserId,
    link_name: linkName,
  });

  if (error) {
    console.warn("link_click_events insert failed", error);
  }
};
