import TransferDetailsView from "./TransferDetailsView";

export const metadata = { title: "Transfer Details" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TransferDetailsView id={id} />;
}
