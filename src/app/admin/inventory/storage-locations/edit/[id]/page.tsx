import EditStorageLocationForm from "./EditStorageLocationForm";

export const metadata = { title: "Edit Storage Location" };

export default async function EditStorageLocationPage({ params }) {
  const { id } = await params;
  return <EditStorageLocationForm locationId={id} />;
}
