import LoyaltySettingsTab from "./LoyaltySettingsTab";

export const metadata = { title: "Loyalty Settings" };

export default function LoyaltySettingsPage() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <LoyaltySettingsTab />
    </div>
  );
}
