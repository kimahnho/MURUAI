import mixpanel from "mixpanel-browser";

export const mp = {
  track: (event: string, properties?: Record<string, unknown>) => {
    mixpanel.track(event, properties);
  },

  identify: (userId: string) => {
    mixpanel.identify(userId);
  },

  setUserProfile: (properties: Record<string, unknown>) => {
    mixpanel.people.set(properties);
  },

  reset: () => {
    mixpanel.reset();
  },
};
