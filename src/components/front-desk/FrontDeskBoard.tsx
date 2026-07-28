"use client";

import { useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import { useShop } from "@/context/shop-context";
import { addCustomerInQueue } from "@/store/slices/customerQueueSlice";
import FrontDeskVerifyPanel from "./FrontDeskVerifyPanel";
import FrontDeskQueue from "./FrontDeskQueue";

// Dedicated dark theme for this page, independent of the app's light/dark
// toggle — matches the old app's front-desk-specific CSS override.
export default function FrontDeskBoard() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { shopId } = useShop();

  function handleCustomerServed(record) {
    dispatch(addCustomerInQueue(record));
    router.push("/pos");
  }

  return (
    <div className="min-h-full bg-[#080b16] p-4">
      <div className="flex flex-col gap-4">
        <FrontDeskVerifyPanel shopId={shopId} onCheckedIn={() => {}} />
        <FrontDeskQueue onCustomerServed={handleCustomerServed} />
      </div>
    </div>
  );
}
