"use client";

import { useState } from "react";
import { useDispatch } from "react-redux";
import { Delete } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateSalesDetail } from "@/store/slices/salesDetailSlice";

const PAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

/**
 * Staff PIN entry — writes `proxyPin` into salesDetail for authorizing actions
 * (discounts/voids). Masked display avoids type="password" so the browser
 * won't prompt to save it.
 *
 * Props:
 *   onDone(pin) — called after the PIN is stored (old `setShareModePin(false)`).
 */
export default function EnterPin({ onDone }) {
  const [enteredPin, setEnteredPin] = useState("");
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();

  const handlePadPress = (key) => {
    if (key === "⌫") {
      setEnteredPin((p) => p.slice(0, -1));
    } else if (key !== "") {
      setEnteredPin((p) => p + key);
    }
  };

  const handleSubmit = () => {
    if (!enteredPin) {
      toast.error("Please enter the PIN.");
      return;
    }

    setLoading(true);
    try {
      dispatch(updateSalesDetail({ proxyPin: enteredPin }));
      toast.success("Pin added successfully");
      onDone?.(enteredPin);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4">
      {/* Masked PIN display */}
      <div className="mb-5 min-h-[52px] select-none rounded-lg border border-border bg-muted px-4 py-2.5 text-center text-[28px] tracking-[10px] text-foreground">
        {enteredPin.length > 0 ? (
          "●".repeat(enteredPin.length)
        ) : (
          <span className="text-sm tracking-normal text-muted-foreground">
            Enter PIN
          </span>
        )}
      </div>

      {/* Calculator pad */}
      <div className="mb-5 grid grid-cols-3 gap-2.5">
        {PAD_KEYS.map((key, i) => (
          <button
            key={i}
            onClick={() => handlePadPress(key)}
            disabled={key === ""}
            className={`h-[60px] rounded-xl border text-[22px] font-semibold transition-transform active:scale-95 ${
              key === "⌫"
                ? "border-destructive/40 bg-destructive/10 text-destructive text-[18px]"
                : key === ""
                ? "cursor-default border-transparent bg-transparent"
                : "border-border bg-card text-foreground hover:bg-muted"
            }`}
          >
            {key === "⌫" ? <Delete className="mx-auto size-5" /> : key}
          </button>
        ))}
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!enteredPin || loading}
        className="h-12 w-full text-base font-semibold"
      >
        {loading ? "Submitting..." : "Submit"}
      </Button>
    </div>
  );
}
