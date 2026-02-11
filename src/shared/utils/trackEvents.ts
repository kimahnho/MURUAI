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
