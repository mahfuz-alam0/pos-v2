import EditPackageForm from "./EditPackageForm";

export const metadata = { title: "Edit Package" };

export default async function EditPackagePage({ params }) {
  const { packageid } = await params;
  return <EditPackageForm packageId={packageid} />;
}
