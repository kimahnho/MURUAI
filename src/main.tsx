import { createRoot } from "react-dom/client";
import { AppRouterProvider } from "./app/providers/AppRouterProvider";
import "@/app/styles/global.css";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";
import { initSentry } from "./shared/utils/initSentry";
import { initMixpanel } from "./shared/utils/initMixpanel";

initSentry();
initMixpanel();

createRoot(document.getElementById("root")!).render(
  <>
    <AppRouterProvider />
    <SpeedInsights />
    <Analytics />
  </>,
);
