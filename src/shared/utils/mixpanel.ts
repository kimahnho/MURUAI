import mixpanel from "mixpanel-browser";
import { isMixpanelInitialized } from "./initMixpanel";

export const mp = {
  track: (event: string, properties?: Record<string, unknown>) => {
    if (!isMixpanelInitialized()) return;
    mixpanel.track(event, properties);
  },

  identify: (userId: string) => {
    if (!isMixpanelInitialized()) return;
    mixpanel.identify(userId);
  },

  setUserProfile: (properties: Record<string, unknown>) => {
    if (!isMixpanelInitialized()) return;
    mixpanel.people.set(properties);
  },

  reset: () => {
    if (!isMixpanelInitialized()) return;
    mixpanel.reset();
  },
};
