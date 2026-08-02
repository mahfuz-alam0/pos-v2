import EditInventoryForm from "./EditInventoryForm";

export const metadata = { title: "Edit Inventory" };

export default async function EditInventoryPage({ params }) {
  const { id } = await params;
  return <EditInventoryForm inventoryId={id} />;
}
