import { createBrowserRouter } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import DesignLayout from "../layout/DesignLayout";
import HomePage from "@/pages/home/HomePage";
import DesignPage from "@/pages/editor/DesignPage";
import MyDocPage from "@/pages/mydoc/MyDocPage";
import AdminPage from "@/pages/admin/AdminPage";
import AdminUserDocsPage from "@/pages/admin/AdminUserDocsPage";
import AuthCallbackPage from "@/pages/auth/AuthCallbackPage";

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
