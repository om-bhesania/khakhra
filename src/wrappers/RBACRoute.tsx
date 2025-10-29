import { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useRBAC } from "@/wrappers/RBACProvider";
import type { RbacAction } from "@/utils/Constants";
import { toast } from "sonner";

export function RBACRoute({ moduleKey, action, children }: {
  moduleKey: string;
  action: RbacAction;
  children: ReactNode;
}) {
  const { can, loading } = useRBAC();
  const location = useLocation();

  if (loading) return null;
  if (!can(moduleKey, action)) {
    toast.error("You do not have required permissions");
    return <Navigate to="/404" replace state={{ from: location }} />;
  }
  return <>{children}</>;
}

export function AdminOnlyRoute({ children }: { children: ReactNode }) {
  const { isAdminEmail, loading } = useRBAC();
  const location = useLocation();
  if (loading) return null;
  if (!isAdminEmail) {
    toast.error("You do not have required permissions");
    return <Navigate to="/404" replace state={{ from: location }} />;
  }
  return <>{children}</>;
}


