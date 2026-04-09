import { sentryVitePlugin } from "@sentry/vite-plugin";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { env } from "process";

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  cacheDir: ".vite",
  esbuild: {
    drop: mode === "production" ? ["console", "debugger"] : [],
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          pdf: ["html-to-image", "jspdf"],
          vendor: ["react", "react-dom", "react-router-dom"],
          supabase: ["@supabase/supabase-js"],
          sentry: ["@sentry/react"],
          mixpanel: ["mixpanel-browser"],
          genai: ["@google/genai"],
          motion: ["framer-motion"],
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
    tailwindcss(),
    sentryVitePlugin({
      authToken: env.VITE_SENTRY_AUTH_TOKEN,
      org: "stayready",
      project: "muruai",
      release: {
        name:
          env.SENTRY_RELEASE ??
          env.VERCEL_GIT_COMMIT_SHA ??
          env.VITE_SENTRY_RELEASE,
      },
      sourcemaps: {
        assets: "./dist/**",
        filesToDeleteAfterUpload: "./dist/**/*.map",
      },
    }),
  ],
  define: {
    __SENTRY_RELEASE__: JSON.stringify(
      env.SENTRY_RELEASE ??
        env.VERCEL_GIT_COMMIT_SHA ??
        env.VITE_SENTRY_RELEASE ??
        null
    ),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
