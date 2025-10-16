import React from "react";
import { Route, Routes } from "react-router-dom";
import { appRoutes } from "../constants/appRoutes";
import { ProtectedRoute } from "../wrappers/ProtectedRoutes"; 
import Layout from "./Layout";
import NotFound from "./NotFound";
import PublicLayout from "./PublicLayout";
import { PublicRoute } from "@/wrappers/PublicRoutes";

function AppRoutes() {
  // Recursively flatten all routes including nested submenus
  const flatRoutes = (function flatten(
    list: any[],
    parentType?: string
  ): any[] {
    return list.reduce((acc: any[], r: any) => {
      const current = [
        {
          name: r.name,
          path: r.path,
          type: r.type ?? parentType,
          element: r.element,
        },
      ];
      const subs =
        Array.isArray(r.submenu) && r.submenu.length
          ? flatten(
              r.submenu.map((s: any) => ({ ...s, type: r.type ?? parentType })),
              r.type ?? parentType
            )
          : [];
      return acc.concat(current, subs);
    }, [] as any[]);
  })(appRoutes);

  return (
    <Routes>
      {/* Public routes - wrap in PublicRoute to redirect if authenticated */}
      <Route element={<PublicLayout />}>
        {flatRoutes
          .filter((r) => r.type === "public")
          .map((r) => {
            const Element = r.element as React.ComponentType | undefined;
            // Check if this is a login/register page
            const isAuthPage =
              r.path === "/login" ||
              r.path === "/register" ||
              r.path === "/signup";
            return (
              <Route
                key={r.path}
                path={r.path}
                element={
                  <PublicRoute redirectIfAuthenticated={isAuthPage}>
                    {Element ? <Element /> : <NotFound />}
                  </PublicRoute>
                }
              />
            );
          })}
      </Route>

      {/* Private routes - wrap in ProtectedRoute */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {flatRoutes
          .filter((r) => r.type === "private")
          .map((r) => {
            const Element = r.element as React.ComponentType | undefined;
            return (
              <Route
                key={r.path}
                path={r.path}
                element={Element ? <Element /> : <NotFound />}
              />
            );
          })}
      </Route>

      {/* Fallback */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default AppRoutes;
