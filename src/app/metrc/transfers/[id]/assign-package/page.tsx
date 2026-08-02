import AssignPackageWizard from "./AssignPackageWizard";

export const metadata = { title: "Assign Package" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AssignPackageWizard id={id} />;
}
