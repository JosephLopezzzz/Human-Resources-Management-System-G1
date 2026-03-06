import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";
import { getCanonicalRole, type RoleKey } from "./roles";

type RequireRoleProps = {
  /** Allowed canonical role keys (legacy roles are mapped via getCanonicalRole) */
  allowed: RoleKey[];
};

function getRole(user: { user_metadata?: Record<string, unknown>; app_metadata?: Record<string, unknown> } | null): string {
  if (!user) return "employee";
  const fromUserMeta = user.user_metadata?.role as string | undefined;
  const fromAppMeta = user.app_metadata?.role as string | undefined;
  const raw = fromUserMeta ?? fromAppMeta ?? "employee";
  return typeof raw === "string" ? raw.trim() : "employee";
}

export function RequireRole({ allowed }: RequireRoleProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  const rawRole = getRole(user);
  const role = getCanonicalRole(rawRole) as RoleKey;
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
