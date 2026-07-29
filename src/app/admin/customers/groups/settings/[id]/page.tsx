import GroupSettingsPage from "./GroupSettingsPage";

export const metadata = { title: "Customer Group Settings" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GroupSettingsPage groupId={id} />;
}
