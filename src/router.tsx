import { createBrowserRouter, Navigate } from "react-router";
import ItemsTestPage from "@/pages/ItemsTestPage";
import WallPage from "@/pages/WallPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <WallPage />,
  },
  {
    path: "/login",
    element: <WallPage authMode="login" />,
  },
  {
    path: "/register",
    element: <WallPage authMode="register" />,
  },
  {
    path: "/items",
    element: <ItemsTestPage />,
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
