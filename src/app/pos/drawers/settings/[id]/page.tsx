import DrawerSettingsPage from "./DrawerSettingsPage";

export const metadata = { title: "Drawer Settings" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DrawerSettingsPage drawerId={id} />;
}
