import React from "react";
import { Route, Routes } from "react-router-dom";
import { appRoutes } from "../constants/appRoutes";
import { ProtectedRoute } from "../wrappers/ProtectedRoutes"; 
import Layout from "./Layout";
import NotFound from "./NotFound";
import PublicLayout from "./PublicLayout";
import { PublicRoute } from "@/wrappers/PublicRoutes";
import { RBACProvider } from "@/wrappers/RBACProvider";
import { RBACRoute, AdminOnlyRoute } from "@/wrappers/RBACRoute";

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
    <RBACProvider>
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
            // Admin hidden pages (any /admin/* route)
            if (typeof r.path === "string" && r.path.startsWith("/admin/")) {
              return (
                <Route
                  key={r.path}
                  path={r.path}
                  element={
                    <AdminOnlyRoute>{Element ? <Element /> : <NotFound />}</AdminOnlyRoute>
                  }
                />
              );
            }
            // RBAC route-level checks if metadata present
            if ((r as any).rbac) {
              const meta = (r as any).rbac as { module: string; action: any };
              return (
                <Route
                  key={r.path}
                  path={r.path}
                  element={
                    <RBACRoute moduleKey={meta.module} action={meta.action}>
                      {Element ? <Element /> : <NotFound />}
                    </RBACRoute>
                  }
                />
              );
            }
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
    </RBACProvider>
  );
}

export default AppRoutes;
