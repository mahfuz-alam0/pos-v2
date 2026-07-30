"use client";

import { useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import { useShop } from "@/context/shop-context";
import { addCustomerInQueue } from "@/store/slices/customerQueueSlice";
import FrontDeskVerifyPanel from "./FrontDeskVerifyPanel";
import FrontDeskQueue from "./FrontDeskQueue";

export default function FrontDeskBoard() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { shopId } = useShop();

  function handleCustomerServed(record) {
    dispatch(addCustomerInQueue(record));
    router.push("/pos");
  }

  return (
    <div className="min-h-full bg-background p-4">
      <div className="flex flex-col gap-4">
        <FrontDeskVerifyPanel shopId={shopId} onCheckedIn={() => {}} />
        <FrontDeskQueue onCustomerServed={handleCustomerServed} />
      </div>
    </div>
  );
}
