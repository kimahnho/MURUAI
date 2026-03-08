import mixpanel from "mixpanel-browser";

let initialized = false;

export const isMixpanelInitialized = () => initialized;

export const initMixpanel = () => {
  const token = import.meta.env.VITE_MIXPANEL_TOKEN;

  if (!token) {
    console.warn("Mixpanel token is not set. Skipping initialization.");
    return;
  }

  const isProd = import.meta.env.MODE === "production";

  mixpanel.init(token, {
    debug: !isProd,
    track_pageview: true,
    persistence: "localStorage",
    record_sessions_percent: isProd ? 30 : 0,
  });

  initialized = true;
};
