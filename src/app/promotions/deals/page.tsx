import DealsTab from "./DealsTab";

export const metadata = { title: "Deals" };

export default function DealsPage() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <DealsTab />
    </div>
  );
}
