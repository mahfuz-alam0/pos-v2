"use client";

import { useCurrentUser } from "@/util/use-current-user";

export function usePermission() {
  const user = useCurrentUser();

  const hasRole = (requiredRole: "SUPER_ADMIN" | "ADMINISTRATION" | "BOTH") => {
    if (!user) return false;
    if (requiredRole === "BOTH") return user.type === "SUPER_ADMIN" || user.type === "ADMINISTRATION";
    return user.type === requiredRole;
  };

  const checkPermission = (code: string) => {
    if (!user) return false;
    if (user.type === "SUPER_ADMIN" || user.type === "ADMINISTRATION") return true;
    return (user.allowedPermissionCodes ?? []).includes(code);
  };

  const checkParentPermission = (parentCode: string) => {
    if (!user) return false;
    if (user.type === "SUPER_ADMIN" || user.type === "ADMINISTRATION") return true;
    return (user.allowedPermissionCodes ?? []).some(
      (code) => code === parentCode || code.startsWith(`${parentCode}.`)
    );
  };

  return { user, hasRole, checkPermission, checkParentPermission };
}
