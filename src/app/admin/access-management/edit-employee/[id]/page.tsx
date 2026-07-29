import EditEmployeePage from "./EditEmployeePage";

export const metadata = { title: "Edit Employee" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditEmployeePage employeeId={id} />;
}
