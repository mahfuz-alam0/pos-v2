const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function checkOrganization(orgUsername) {
  const res = await fetch(
    `${API_URL}/organization-accounts/check-if-organization-functional?orgUsername=${encodeURIComponent(orgUsername)}`
  );

  if (!res.ok) {
    throw new Error("Organization not found");
  }

  return res.json(); // expected: { orgId, ... }
}
