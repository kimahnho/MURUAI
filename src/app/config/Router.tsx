import { Suspense, lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import MainLayout from "../layout/MainLayout";

const DesignLayout = lazy(() => import("../layout/DesignLayout"));
const HomePage = lazy(() => import("@/pages/home/HomePage"));
const DesignPage = lazy(() => import("@/pages/editor/DesignPage"));
const MyDocPage = lazy(() => import("@/pages/mydoc/MyDocPage"));
const AdminPage = lazy(() => import("@/pages/admin/AdminPage"));
const AdminUserDocsPage = lazy(() => import("@/pages/admin/AdminUserDocsPage"));
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
        path: "mydoc",
        element: withSuspense(<MyDocPage />),
      },
      {
        path: "admin/user-docs",
        element: withSuspense(<AdminUserDocsPage />),
      },
      {
        path: "admin",
        element: withSuspense(<AdminPage />),
      },
    ],
  },
  {
    path: "/",
    element: withSuspense(<DesignLayout />),
    children: [
      {
        path: "design",
        element: withSuspense(<DesignPage />),
      },
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
