"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useShop } from "@/context/shop-context";
import { parseDLBarcode } from "@/lib/aamva";
import { findCustomersByLicense, findCustomersByInfoString } from "@/services/customers/lookup";
import { addCustomerToQueue } from "@/services/customerQueue/add";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Time to wait after the last scanner keystroke before parsing. Hardware scan
// guns emit the whole barcode in fast chunks; this debounce collects them.
const SCAN_DEBOUNCE_MS = 2000;

function Spinner() {
  return <div className="size-5 animate-spin rounded-full border-2 border-[#1890ff] border-t-transparent" />;
}

// Exact clone of the old POS Scan modal (routes/components/scan/index.js).
export default function ScanIdDialog({ open, onOpenChange }) {
  const { shopId } = useShop();

  const [isDebounceLoading, setIsDebounceLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [processingMessage, setProcessingMessage] = useState("");
  const [scanFailed, setScanFailed] = useState(false);
  const [customerInfo, setCustomerInfo] = useState(null);
  const [customerStatus, setCustomerStatus] = useState("");
  const [customerNotFound, setCustomerNotFound] = useState(false);

  const inputRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!open) {
      clearTimeout(timerRef.current);
      setIsDebounceLoading(false);
      setIsLoading(false);
      setProcessingMessage("");
      setScanFailed(false);
      setCustomerInfo(null);
      setCustomerStatus("");
      setCustomerNotFound(false);
      return;
    }
    const t = setTimeout(() => inputRef.current?.focus(), 500);
    const keepFocus = () => inputRef.current?.focus();
    document.addEventListener("click", keepFocus);
    return () => {
      clearTimeout(t);
      document.removeEventListener("click", keepFocus);
    };
  }, [open]);

  function handleInput(e) {
    const value = e.target.value;
    clearTimeout(timerRef.current);
    if (!value) {
      setIsDebounceLoading(false);
      return;
    }
    setIsDebounceLoading(true);
    timerRef.current = setTimeout(() => {
      setIsDebounceLoading(false);
      handleScan(value);
    }, SCAN_DEBOUNCE_MS);
  }

  async function handleScan(raw) {
    const scanned = raw.trim();
    if (!scanned) {
      setScanFailed(true);
      return;
    }

    setIsLoading(true);
    setProcessingMessage("Processing... Please wait.");
    setScanFailed(false);

    try {
      const data = parseDLBarcode(scanned);
      if (!data || !data.dob || !data.licenseId || !data.expiry) {
        setScanFailed(true);
        setIsLoading(false);
        setProcessingMessage("");
        return;
      }

      setCustomerInfo({
        name: [data.firstName, data.middleName, data.lastName].filter(Boolean).join(" "),
        dob: data.dob,
        license: data.licenseId,
        expires: data.expiry,
      });

      let found = await findCustomersByLicense({ shopId, drivingLicense: data.licenseId }).catch(
        () => []
      );

      if (found?.length) {
        await addCustomerToQueue({
          shopId,
          customerId: found[0].id || found[0]._id,
          isAnonymous: false,
        });
        toast.success("Customer is Added to Queue");
        setCustomerStatus("Customer Found");
        setScanFailed(false);
        onOpenChange(false);
      } else {
        setCustomerStatus("Customer Not Found");
        setCustomerNotFound(true);
        found = await findCustomersByInfoString({
          shopId,
          firstName: data.firstName,
          lastName: data.lastName,
          dob: data.dob,
        }).catch(() => []);
        if (found?.length) {
          await addCustomerToQueue({
            shopId,
            customerId: found[0].id || found[0]._id,
            isAnonymous: false,
          });
          toast.success("Customer is Added to Queue");
          setCustomerStatus("Customer Found");
          setCustomerNotFound(false);
          onOpenChange(false);
          return;
        }
        setScanFailed(false);
      }

      setIsLoading(false);
      setProcessingMessage("");
    } catch (err) {
      console.error("Scan error:", err);
      setIsLoading(false);
      setProcessingMessage("");
      setScanFailed(true);
    }
  }

  function handleTryAgain() {
    setScanFailed(false);
    setProcessingMessage("");
    setCustomerNotFound(false);
    setCustomerInfo(null);
    setCustomerStatus("");
    if (inputRef.current) inputRef.current.value = "";
    inputRef.current?.focus();
  }

  function handleAddCustomer() {
    toast.info(
      "Add Customer form is not available in the new POS yet. Create the customer from the Customers page."
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-60 sm:max-w-130">
        <DialogHeader>
          <DialogTitle>Add customer by scanning their ID</DialogTitle>
        </DialogHeader>

        <div className="relative">
          {!scanFailed && (
            <div className="mb-5 text-center">
              <h1 className="text-2xl font-semibold text-text">Waiting for Scanned ID...</h1>
            </div>
          )}

          {isDebounceLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
              <Spinner />
              <span className="ml-2.5 text-sm text-text">Please wait...</span>
            </div>
          )}

          {isLoading && !isDebounceLoading && (
            <div className="mt-5 flex items-center justify-center">
              <Spinner />
              <span className="ml-2.5 text-sm text-text">{processingMessage}</span>
            </div>
          )}

          {scanFailed && (
            <div className="mt-5 text-center">
              <h2 className="mb-3 text-lg font-semibold text-text">Scan Failed</h2>
              <Button
                className="bg-[#1890ff] text-white hover:bg-[#1890ff]/90"
                onClick={handleTryAgain}
              >
                Click to Scan Again
              </Button>
            </div>
          )}

          <div className="mt-5 flex h-37.5 items-stretch justify-between">
            <div className="text-sm text-text">
              <p className="mb-3">Name: {customerInfo?.name || ""}</p>
              <p className="mb-3">DOB: {customerInfo?.dob || ""}</p>
              <p className="mb-3">License: {customerInfo?.license || ""}</p>
              <p className="mb-3">Expires: {customerInfo?.expires || ""}</p>
            </div>

            <div className="mx-5 h-full border-l border-[#ccc]" />

            <div className="text-sm text-text">
              <p>{customerStatus || "Status not available"}</p>
            </div>
          </div>

          {customerNotFound && (
            <div className="mt-5 text-center">
              <Button
                className="bg-[#1890ff] text-white hover:bg-[#1890ff]/90"
                onClick={handleTryAgain}
              >
                Try Again
              </Button>
              <Button variant="outline" className="ml-2.5" onClick={handleAddCustomer}>
                Add Customer
              </Button>
            </div>
          )}

          {/* Hidden input capturing the keyboard-wedge scanner output */}
          <input
            ref={inputRef}
            defaultValue=""
            onInput={handleInput}
            aria-hidden="true"
            className="absolute -top-full -left-full h-0 w-0 opacity-0"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
