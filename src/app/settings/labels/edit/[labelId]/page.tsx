import LabelEditorForm from "../../LabelEditorForm";

export const metadata = { title: "Edit Label" };

export default async function EditLabelPage({ params }: { params: Promise<{ labelId: string }> }) {
  const { labelId } = await params;
  return <LabelEditorForm labelId={labelId} />;
}
