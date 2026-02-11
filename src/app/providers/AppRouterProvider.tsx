import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Sentry from "@sentry/react";
import { router } from "../config/Router";
import { AuthProvider } from "@/shared/providers/AuthProvider";
import { ErrorFallback } from "@/shared/ui/ErrorFallback";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5분간 데이터를 신선하게 유지
      gcTime: 1000 * 60 * 30, // 30분간 캐시 보관
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const AppRouterProvider = () => {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <ErrorFallback error={error as Error} resetError={resetError} />
      )}
    >
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryClientProvider>
    </Sentry.ErrorBoundary>
  );
};
