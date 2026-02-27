import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";

type RequireRoleProps = {
  allowed: string[];
};

export function RequireRole({ allowed }: RequireRoleProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  const role = (user?.user_metadata?.role as string | undefined) ?? "employee";
  const isAllowed = allowed.includes(role);

  if (!isAllowed) {
    return (
      <Navigate
        to="/"
        replace
        state={{ from: location, unauthorized: true }}
      />
    );
  }

  return <Outlet />;
}

