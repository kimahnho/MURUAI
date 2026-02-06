import { createBrowserRouter } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import DesignLayout from "../layout/DesignLayout";
import HomePage from "@/features/home/pages/HomePage";
import DesignPage from "@/features/editor/pages/DesignPage";
import MyDocPage from "@/features/mydoc/pages/MyDocPage";
import AdminPage from "@/features/admin/pages/AdminPage";
import AdminUserDocsPage from "@/features/admin/pages/AdminUserDocsPage";
import AuthCallbackPage from "@/features/auth/pages/AuthCallbackPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: "mydoc",
        element: <MyDocPage />,
      },
      {
        path: "admin/user-docs",
        element: <AdminUserDocsPage />,
      },
      {
        path: "admin",
        element: <AdminPage />,
      },
    ],
  },
  {
    path: "/",
    element: <DesignLayout />,
    children: [
      {
        path: "design",
        element: <DesignPage />,
      },
      {
        path: ":docId/edit",
        element: <DesignPage />,
      },
    ],
  },
  {
    path: "/auth/callback",
    element: <AuthCallbackPage />,
  },
]);
