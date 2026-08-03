import LiveCountSessionPage from "./LiveCountSessionPage";

export const metadata = { title: "Live Count Session" };

export default async function Page({ params }) {
  const { id } = await params;
  return <LiveCountSessionPage sessionId={id} />;
}
