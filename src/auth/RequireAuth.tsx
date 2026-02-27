import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";

export function RequireAuth() {
  const { user, loading, needsMfa } = useAuth();
  const location = useLocation();

  if (loading) return null;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (needsMfa && location.pathname !== "/mfa") {
    return <Navigate to="/mfa" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

