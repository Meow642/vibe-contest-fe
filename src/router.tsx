import { createBrowserRouter, Navigate } from "react-router";
import ItemsTestPage from "@/pages/ItemsTestPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/items" replace />,
  },
  {
    path: "/items",
    element: <ItemsTestPage />,
  },
]);
