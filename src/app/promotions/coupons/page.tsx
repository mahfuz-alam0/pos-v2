import CouponsTab from "./CouponsTab";

export const metadata = { title: "Coupons" };

export default function CouponsPage() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <CouponsTab />
    </div>
  );
}
