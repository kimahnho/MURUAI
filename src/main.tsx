import { createRoot } from "react-dom/client";
import { AppRouterProvider } from "./app/providers/AppRouterProvider";
import "@/app/styles/global.css";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";
import { initSentry } from "./shared/lib/initSentry";
import { initMixpanel } from "./shared/lib/initMixpanel";

initSentry();
initMixpanel();

createRoot(document.getElementById("root")!).render(
  <>
    <AppRouterProvider />
    <SpeedInsights />
    <Analytics />
  </>,
);
