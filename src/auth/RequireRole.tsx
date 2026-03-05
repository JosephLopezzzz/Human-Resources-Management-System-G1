import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";

type RequireRoleProps = {
  allowed: string[];
};

const FULL_ACCESS_ROLES = ["admin", "super_admin"];

function getRole(user: { user_metadata?: Record<string, unknown>; app_metadata?: Record<string, unknown> } | null): string {
  if (!user) return "employee";
  const fromUserMeta = user.user_metadata?.role as string | undefined;
  const fromAppMeta = user.app_metadata?.role as string | undefined;
  const raw = fromUserMeta ?? fromAppMeta ?? "employee";
  return typeof raw === "string" ? raw.trim() : "employee";
}

function hasFullAccess(role: string): boolean {
  const r = role.toLowerCase();
  return r === "admin" || r === "super_admin" || r === "superadmin";
}

export function RequireRole({ allowed }: RequireRoleProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  const role = getRole(user);
  // admin and super_admin have full access to everything
  const hasFullAccessRole = hasFullAccess(role);
  const isAllowed = hasFullAccessRole || allowed.includes(role);

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

