import { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface PublicRouteProps {
  children: ReactNode;
  redirectTo?: string;
  redirectIfAuthenticated?: boolean; // Set to true for login/register pages
}

export const PublicRoute = ({
  children,
  redirectTo = "/",
  redirectIfAuthenticated = false,
}: PublicRouteProps) => {
  const location = useLocation();
  const { user, loading } = useAuth();

  // Show loading while checking auth state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If user is authenticated and this is a login/register page, redirect to dashboard
  if (user && redirectIfAuthenticated) {
    const from = (location.state as any)?.from?.pathname || redirectTo;
    return <Navigate to={from} replace />;
  }

  return <>{children}</>;
};
