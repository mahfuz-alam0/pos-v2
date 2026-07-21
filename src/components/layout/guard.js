export function evalGuard(guard, permission) {
  if (!guard || guard.type === "any") return true;

  const { checkPermission, checkParentPermission, hasRole, user } = permission;
  if (!user) return false;

  switch (guard.type) {
    case "permission":
      return checkPermission(guard.value);
    case "parent":
      return checkParentPermission(guard.value);
    case "anyParent":
      return guard.value.some((v) => checkParentPermission(v));
    case "role":
      return hasRole(guard.value);
    case "featureScope":
      return Boolean(user?.orgFeatureScopes?.includes(guard.value));
    default:
      return true;
  }
}

export function filterNav(items, permission) {
  return items
    .map((item) => {
      if (!evalGuard(item.guard, permission)) return null;
      if (item.children) {
        const children = filterNav(item.children, permission);
        if (children.length === 0) return null;
        return { ...item, children };
      }
      return item;
    })
    .filter(Boolean);
}
