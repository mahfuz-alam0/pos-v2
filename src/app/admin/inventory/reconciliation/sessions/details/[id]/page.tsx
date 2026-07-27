import SessionDetailsView from "../SessionDetailsView";

export const metadata = { title: "Session Details" };

export default async function SessionDetailsPage({ params }) {
  const { id } = await params;
  return <SessionDetailsView sessionId={id} />;
}
