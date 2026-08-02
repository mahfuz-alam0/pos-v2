import { SessionProvider } from "../../session-context";
import SessionConfigurationStep from "../../SessionConfigurationStep";

export const metadata = { title: "Update Session" };

export default async function EditSessionPage({ params }) {
  const { id } = await params;
  return (
    <SessionProvider>
      <SessionConfigurationStep mode="edit" sessionId={id} />
    </SessionProvider>
  );
}
