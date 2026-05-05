"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { Role } from "@/lib/types";

export function RoleGuard({
  roles,
  children,
  fallback = null,
}: {
  roles: Role[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { role, isApproved } = useAuth();
  if (!isApproved) return <>{fallback}</>;
  if (!role || !roles.includes(role)) return <>{fallback}</>;
  return <>{children}</>;
}
