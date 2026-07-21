"use client";

import { useEffect, useState } from "react";

const ROLES = ["SUPER_ADMIN", "ADMINISTRATION", "BOTH"];

function readUser() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("userInfo");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function useAuthUser() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    setUser(readUser());
  }, []);

  return user;
}

export function usePermission() {
  const user = useAuthUser();
  const permissions = user?.allowedPermissionCodes || [];

  const hasRole = (requiredRole) => {
    if (!user) return false;
    if (requiredRole === "BOTH") {
      return ["SUPER_ADMIN", "ADMINISTRATION"].includes(user.type);
    }
    return user.type === requiredRole;
  };

  const checkPermission = (code) => {
    if (!user) return false;
    if (ROLES.includes(code)) return hasRole(code);
    if (user.type === "SUPER_ADMIN" || user.type === "ADMINISTRATION") return true;
    if (user.type === "ACCESS_CONTROLLED") return permissions.includes(code);
    return false;
  };

  const checkParentPermission = (parentCode) => {
    if (!user) return false;
    if (ROLES.includes(parentCode)) return hasRole(parentCode);
    if (user.type === "SUPER_ADMIN" || user.type === "ADMINISTRATION") return true;
    if (user.type === "ACCESS_CONTROLLED") {
      return permissions.some((p) => p.startsWith(`${parentCode}.`));
    }
    return false;
  };

  return { checkPermission, checkParentPermission, hasRole, user };
}
