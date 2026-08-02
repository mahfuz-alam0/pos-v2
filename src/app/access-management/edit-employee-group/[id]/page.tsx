import GroupFormPage from "../../employee-group/GroupFormPage";

export const metadata = { title: "Edit Employee Group" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GroupFormPage groupId={id} />;
}
