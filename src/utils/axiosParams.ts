// Ported from old util/helpers.js — turns the POS's [{name,value}] filter
// arrays into an axios `params` object. Array-valued filters that the backend
// expects as repeated query keys (categoryIds, brandIds, …) are passed through
// as arrays; every other array is joined into a comma string.
const REPEATED_ARRAY_KEYS = new Set([
  "categoryIds",
  "brandIds",
  "tagIds",
  "productIds",
  "employeeIds",
  "excludeProductIds",
  "includeProductIds",
  "packagePlatformIds",
  "ids",
  "excludedPackageIds",
]);

export function generateAxiosParams(params) {
  const obj = {};
  if (!params) return obj;
  params.forEach((param) => {
    if (param.value === null) {
      obj[param.name] = null;
    } else if (Array.isArray(param.value)) {
      if (REPEATED_ARRAY_KEYS.has(param.name)) {
        if (param.value.length > 0) obj[param.name] = param.value;
      } else {
        obj[param.name] = param.value.join(",");
      }
    } else {
      obj[param.name] = param.value;
    }
  });
  return obj;
}
