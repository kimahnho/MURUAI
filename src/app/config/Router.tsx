import { Suspense, lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import MainLayout from "../layout/MainLayout";

const DesignLayout = lazy(() => import("../layout/DesignLayout"));
const HomePage = lazy(() => import("@/pages/home/HomePage"));
const DashboardRoute = lazy(() => import("@/pages/dashboard/DashboardRoute"));
const DesignPage = lazy(() => import("@/pages/editor/DesignPage"));
const MyDocPage = lazy(() => import("@/pages/mydoc/MyDocPage"));
const AdminGuard = lazy(() => import("@/pages/admin/AdminGuard"));
const AdminPage = lazy(() => import("@/pages/admin/AdminPage"));
const AdminUserDocsPage = lazy(() => import("@/pages/admin/AdminUserDocsPage"));
const AboutPage = lazy(() => import("@/pages/about/AboutPage"));
const AuthCallbackPage = lazy(() => import("@/pages/auth/AuthCallbackPage"));

const withSuspense = (element: React.ReactElement) => (
  <Suspense fallback={null}>{element}</Suspense>
);

export const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: withSuspense(<HomePage />),
      },
      {
        path: "dashboard",
        element: withSuspense(<DashboardRoute />),
      },
      {
        path: "mydoc",
        element: withSuspense(<MyDocPage />),
      },
      {
        path: "about",
        element: withSuspense(<AboutPage />),
      },
      {
        path: "admin",
        element: withSuspense(<AdminGuard />),
        children: [
          { index: true, element: withSuspense(<AdminPage />) },
          { path: "user-docs", element: withSuspense(<AdminUserDocsPage />) },
        ],
      },
    ],
  },
  {
    path: "/",
    element: withSuspense(<DesignLayout />),
    children: [
      {
        path: ":docId/edit",
        element: withSuspense(<DesignPage />),
      },
    ],
  },
  {
    path: "/auth/callback",
    element: withSuspense(<AuthCallbackPage />),
  },
]);
