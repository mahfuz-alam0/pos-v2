"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Mail, Phone, Pencil } from "lucide-react";
import { useShop } from "@/context/shop-context";
import { parseDLBarcode } from "@/lib/aamva";
import { findCustomersByLicense, findCustomersByInfoString } from "@/services/customers/lookup";
import { addCustomerToQueue } from "@/services/customerQueue/add";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import AddCustomerForm from "@/components/customers/AddCustomerForm";

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
  // The matched customer's own record — held here (instead of auto-queueing
  // and closing immediately) so their email/phone/photo can be shown and
  // edited on the spot before adding them to the queue.
  const [foundCustomer, setFoundCustomer] = useState(null);
  const [queueing, setQueueing] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

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
      setFoundCustomer(null);
      setQueueing(false);
      setEditOpen(false);
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
        setFoundCustomer(found[0]);
        setCustomerStatus("Customer Found");
        setScanFailed(false);
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
          setFoundCustomer(found[0]);
          setCustomerStatus("Customer Found");
          setCustomerNotFound(false);
          setIsLoading(false);
          setProcessingMessage("");
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
    setFoundCustomer(null);
    if (inputRef.current) inputRef.current.value = "";
    inputRef.current?.focus();
  }

  async function handleAddToQueue() {
    const customerId = foundCustomer?.id || foundCustomer?._id;
    if (!customerId || queueing) return;
    setQueueing(true);
    try {
      await addCustomerToQueue({ shopId, customerId, isAnonymous: false });
      toast.success("Customer is Added to Queue");
      onOpenChange(false);
    } catch (err) {
      toast.error(err?.message || "Failed to add customer to queue");
    } finally {
      setQueueing(false);
    }
  }

  function handleAddCustomer() {
    toast.info(
      "Add Customer form is not available in the new POS yet. Create the customer from the Customers page."
    );
  }

  return (
    <>
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

          {foundCustomer && (
            <div className="mt-5 rounded-lg border-l-4 border-[#52c41a] bg-[#f6ffed] p-4">
              <div className="flex items-center gap-3">
                {foundCustomer.avatarUrl ? (
                  <img
                    src={foundCustomer.avatarUrl}
                    alt=""
                    className="size-14 shrink-0 rounded-full object-cover ring-2 ring-[#52c41a]"
                  />
                ) : (
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#52c41a] text-lg font-bold text-white">
                    {[foundCustomer.firstName?.[0], foundCustomer.lastName?.[0]].filter(Boolean).join("").toUpperCase() || "?"}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900">
                    {foundCustomer.firstName} {foundCustomer.lastName}
                  </p>
                  {foundCustomer.email && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-600">
                      <Mail className="size-3" /> {foundCustomer.email}
                    </p>
                  )}
                  {foundCustomer.phone && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-600">
                      <Phone className="size-3" /> {foundCustomer.phone}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditOpen(true)}>
                  <Pencil /> Edit Customer
                </Button>
                <Button
                  className="bg-[#1890ff] text-white hover:bg-[#1890ff]/90"
                  disabled={queueing}
                  onClick={handleAddToQueue}
                >
                  {queueing ? "Adding…" : "Add to Queue"}
                </Button>
              </div>
            </div>
          )}

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

    <AddCustomerForm
      open={editOpen}
      zIndex={80}
      customer={foundCustomer}
      onClose={() => setEditOpen(false)}
      onCreated={() => {}}
      onUpdated={(updated) => {
        setFoundCustomer((prev) => ({ ...prev, ...updated }));
        setEditOpen(false);
      }}
    />
    </>
  );
}
