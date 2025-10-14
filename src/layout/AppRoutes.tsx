import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { appRoutes } from "../constants/appRoutes";
import Home from "../pages/Home";
import Layout from "./Layout";
import PublicLayout from "./PublicLayout";
import NotFound from "./NotFound";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthed =
    typeof window !== "undefined" && !!localStorage.getItem("authToken");
  return isAuthed ? <>{children}</> : <Navigate to="/login" replace />;
}

function AppRoutes() {
  // Recursively flatten all routes including nested submenus
  const flatRoutes = (function flatten(list: any[], parentType?: string): any[] {
    return list.reduce((acc: any[], r: any) => {
      const current = [{ name: r.name, path: r.path, type: r.type ?? parentType, element: r.element }];
      const subs = Array.isArray(r.submenu) && r.submenu.length
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
      {/* Public routes generated */}
      <Route element={<PublicLayout />}>
        {flatRoutes
          .filter((r) => r.type === "public")
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

      {/* Private routes generated */}
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
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
