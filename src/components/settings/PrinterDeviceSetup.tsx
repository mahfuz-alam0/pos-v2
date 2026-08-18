"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useShop } from "@/context/shop-context";
import { useSettings } from "@/context/settings-context";
import { connectToSocket } from "@/lib/socket";
import { usePrintClients, JOB_TYPES } from "@/hooks/usePrintClients";
import {
  getUserPrintPreference,
  deleteUserPrintPreference,
  createPrintJob,
} from "@/services/printClients/printClients";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const JOB_TYPE_NAMES = {
  PACKAGE_LABEL: "Package Label",
  EXIT_LABEL: "Exit Label",
  RECEIPT: "Receipt",
  DELIVERY_RECEIPT: "Delivery Receipt",
  PRE_ORDER_FULFILLMENT_PULL_SHEET: "Pre-order Fulfillment Pull Sheet",
  OTHER: "Other",
};

const SAMPLE_PACKAGE = {
  advertisedId: "PKG3985759",
  name: "Package Oreoz",
  originalBrand: null,
  originalCategory: "Vape Cartridges",
  quantityLeft: 200,
  uoMShortForm: "u",
  unitCost: 20,
  expiry: "2024-09-20",
  supplierName: "Alma Cannabis",
  createdAt: "2024-09-03T11:00:38.247Z",
};

function getTabLabel(jobType) {
  if (jobType === JOB_TYPES.PRE_ORDER_FULFILLMENT_PULL_SHEET) return "PRE ORDER";
  return jobType.replace(/_/g, " ");
}

function getJobTypeDisplayName(jobType) {
  return JOB_TYPE_NAMES[jobType] || jobType.replace(/_/g, " ");
}

function generatePrintContent(jobType, pkg) {
  const baseStyle = "border: 2px solid #000; padding: 20px; max-width: 400px; margin: 0 auto;";

  switch (jobType) {
    case "EXIT_LABEL":
      return `
        <div style="${baseStyle}">
          <h3>EXIT LABEL</h3>
          <p><strong>Package ID:</strong> ${pkg.advertisedId}</p>
          <p><strong>Name:</strong> ${pkg.name}</p>
          <p><strong>Quantity:</strong> ${pkg.quantityLeft} ${pkg.uoMShortForm}</p>
          <p><strong>Expiry:</strong> ${pkg.expiry}</p>
          <p><strong>Supplier:</strong> ${pkg.supplierName}</p>
          <p><strong>Category:</strong> ${pkg.originalCategory}</p>
        </div>
      `;
    case "PACKAGE_LABEL":
      return `
        <div style="${baseStyle}">
          <h3>PACKAGE LABEL</h3>
          <p><strong>Package ID:</strong> ${pkg.advertisedId}</p>
          <p><strong>Product:</strong> ${pkg.name}</p>
          <p><strong>Brand:</strong> ${pkg.originalBrand || "N/A"}</p>
          <p><strong>Quantity:</strong> ${pkg.quantityLeft} ${pkg.uoMShortForm}</p>
          <p><strong>Unit Cost:</strong> $${pkg.unitCost}</p>
          <p><strong>Expiry Date:</strong> ${pkg.expiry}</p>
          <p><strong>Supplier:</strong> ${pkg.supplierName}</p>
          <p><strong>Category:</strong> ${pkg.originalCategory}</p>
          <p><strong>Created:</strong> ${new Date(pkg.createdAt).toLocaleDateString()}</p>
        </div>
      `;
    case "RECEIPT":
      return `
        <div style="${baseStyle}">
          <h3>RECEIPT</h3>
          <p><strong>Receipt #:</strong> ${pkg.advertisedId}</p>
          <p><strong>Item:</strong> ${pkg.name}</p>
          <p><strong>Quantity:</strong> ${pkg.quantityLeft} ${pkg.uoMShortForm}</p>
          <p><strong>Unit Price:</strong> $${pkg.unitCost}</p>
          <p><strong>Total:</strong> $${(pkg.unitCost * pkg.quantityLeft).toFixed(2)}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          <p><strong>Supplier:</strong> ${pkg.supplierName}</p>
        </div>
      `;
    case "DELIVERY_RECEIPT":
      return `
        <div style="${baseStyle}">
          <h3>DELIVERY RECEIPT</h3>
          <p><strong>Delivery ID:</strong> ${pkg.advertisedId}</p>
          <p><strong>Product:</strong> ${pkg.name}</p>
          <p><strong>Quantity Delivered:</strong> ${pkg.quantityLeft} ${pkg.uoMShortForm}</p>
          <p><strong>Delivery Date:</strong> ${new Date().toLocaleDateString()}</p>
          <p><strong>Supplier:</strong> ${pkg.supplierName}</p>
          <p><strong>Received By:</strong> _________________</p>
          <p><strong>Signature:</strong> _________________</p>
        </div>
      `;
    case "PRE_ORDER_FULFILLMENT_PULL_SHEET":
      return `
        <div style="${baseStyle}">
          <h3>PRE-ORDER FULFILLMENT PULL SHEET</h3>
          <p><strong>Order ID:</strong> ${pkg.advertisedId}</p>
          <p><strong>Product:</strong> ${pkg.name}</p>
          <p><strong>Quantity To Pull:</strong> ${pkg.quantityLeft} ${pkg.uoMShortForm}</p>
          <p><strong>Category:</strong> ${pkg.originalCategory}</p>
          <p><strong>Supplier:</strong> ${pkg.supplierName}</p>
          <p><strong>Notes:</strong> _____________________________</p>
        </div>
      `;
    case "OTHER":
      return `
        <div style="${baseStyle}">
          <h3>OTHER PRINT JOB</h3>
          <p><strong>Reference ID:</strong> ${pkg.advertisedId}</p>
          <p><strong>Name:</strong> ${pkg.name}</p>
          <p><strong>Quantity:</strong> ${pkg.quantityLeft} ${pkg.uoMShortForm}</p>
          <p><strong>Category:</strong> ${pkg.originalCategory}</p>
          <p><strong>Supplier:</strong> ${pkg.supplierName}</p>
        </div>
      `;
    default:
      return "<p>No content available for printing</p>";
  }
}

function printInCurrentWindow(content, jobType, numCopies) {
  setTimeout(() => {
    try {
      document.getElementById("temp-print-content")?.remove();
      document.getElementById("temp-print-styles")?.remove();

      const printDiv = document.createElement("div");
      printDiv.id = "temp-print-content";
      printDiv.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:auto;background:white;";

      let copiesContent = "";
      for (let i = 0; i < numCopies; i++) {
        copiesContent += `
          <div style="margin-bottom: 30px; ${i < numCopies - 1 ? "page-break-after: always;" : ""}">
            <div style="text-align: center; margin-bottom: 10px; font-size: 12px; color: #666; font-weight: bold;">
              Test Print - ${getJobTypeDisplayName(jobType)} - Copy ${i + 1} of ${numCopies}
            </div>
            ${content}
          </div>
        `;
      }
      printDiv.innerHTML = copiesContent;
      document.body.appendChild(printDiv);

      const printStyles = document.createElement("style");
      printStyles.id = "temp-print-styles";
      printStyles.innerHTML = `
        @media print {
          body * { visibility: hidden; }
          #temp-print-content, #temp-print-content * { visibility: visible; }
          #temp-print-content {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
          }
        }
      `;
      document.head.appendChild(printStyles);

      setTimeout(() => {
        try {
          window.print();
        } catch {
          toast.error("Failed to print. Please try again or print manually.");
        } finally {
          setTimeout(() => {
            document.getElementById("temp-print-content")?.remove();
            document.getElementById("temp-print-styles")?.remove();
          }, 1000);
        }
      }, 100);
    } catch {
      toast.error("Print functionality is not available. Please contact support.");
    }
  }, 0);
}

function openBrowserPrint(content, jobType, numCopies = 1) {
  setTimeout(() => {
    try {
      const printWindow = window.open("", "_blank");

      if (!printWindow) {
        toast.warning("Popup blocked by browser. Using current window to print.");
        printInCurrentWindow(content, jobType, numCopies);
        return;
      }

      setTimeout(() => {
        try {
          if (printWindow.closed) return;
          if (!printWindow.document) {
            printInCurrentWindow(content, jobType, numCopies);
            return;
          }

          let copiesContent = "";
          for (let i = 0; i < numCopies; i++) {
            copiesContent += `
              <div class="copy-container" ${i < numCopies - 1 ? 'style="page-break-after: always;"' : ""}>
                <div class="copy-header" style="text-align: center; margin-bottom: 10px; font-size: 12px; color: #666;">
                  Copy ${i + 1} of ${numCopies}
                </div>
                ${content}
              </div>
            `;
          }

          printWindow.document.open();
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Test Print - ${getJobTypeDisplayName(jobType)}</title>
                <style>
                  body { font-family: Arial, sans-serif; margin: 20px; }
                  .print-header { text-align: center; margin-bottom: 20px; }
                  .print-content { margin: 20px 0; }
                  .copy-container { margin-bottom: 30px; }
                  .copy-header { font-weight: bold; }
                  @media print {
                    body { margin: 0; }
                    .no-print { display: none; }
                    .copy-container { page-break-inside: avoid; }
                  }
                </style>
              </head>
              <body>
                <div class="print-header"><h2>Test Print - ${getJobTypeDisplayName(jobType)}</h2></div>
                <div class="print-content">${copiesContent}</div>
                <div class="no-print" style="text-align: center; margin-top: 20px;">
                  <button onclick="window.print()">Print</button>
                  <button onclick="window.close()">Close</button>
                </div>
                <script>
                  window.onload = function() {
                    setTimeout(() => { try { window.print(); } catch (e) { console.error('Print failed:', e); } }, 200);
                  };
                </script>
              </body>
            </html>
          `);
          printWindow.document.close();
        } catch (writeError) {
          console.error("Failed to write to print window:", writeError);
          if (!printWindow.closed) printWindow.close();
          printInCurrentWindow(content, jobType, numCopies);
        }
      }, 100);
    } catch (error) {
      console.error("Error opening print window:", error);
      toast.info("Using current window to print due to browser restrictions.");
      printInCurrentWindow(content, jobType, numCopies);
    }
  }, 0);
}

// Device list + save/delete/test-print flow for the hardware-client relay.
// Deliberately chrome-agnostic (no Dialog/Drawer wrapper of its own) so it can
// be dropped into a centered Dialog (web build) or a tab panel inside a
// sliding Drawer (Tauri build) without duplicating this logic.
export default function PrinterDeviceSetup({ onSelect, defaultJobType = JOB_TYPES.PACKAGE_LABEL, onCancel }) {
  const { shopId } = useShop();
  const { printType } = useSettings();

  const [activeJobType, setActiveJobType] = useState(defaultJobType);
  const [selectedPrinters, setSelectedPrinters] = useState({});
  const [preferences, setPreferences] = useState({});
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const [testPrintOpen, setTestPrintOpen] = useState(false);
  const [testPrintJobType, setTestPrintJobType] = useState(JOB_TYPES.PACKAGE_LABEL);
  const [testPrintCopies, setTestPrintCopies] = useState(1);
  const [testPrintLoading, setTestPrintLoading] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  const { printClients, loading, error, setUserPreference } = usePrintClients(shopId, activeJobType);

  const socketRef = useRef(null);
  const pendingRequestsRef = useRef({});
  const timeoutIdsRef = useRef({});

  // Socket for hardware print-job acknowledgements. Mount/unmount (driven by
  // the parent Dialog/Tab showing or hiding this component) is what used to
  // be gated by an `open` prop — now it's just the component's own lifecycle.
  useEffect(() => {
    if (!shopId) return;

    const socket = connectToSocket({
      url: `${process.env.NEXT_PUBLIC_BASE_URL}/hclient-web-facing`,
      shopId,
    });
    if (!socket) return;

    socket.on("connect", () => setSocketConnected(true));
    socket.on("disconnect", () => setSocketConnected(false));
    socket.on("connect_error", () => setSocketConnected(false));
    socket.on("printJobPicked", (data) => {
      const requestId = data?.requestId;
      if (!pendingRequestsRef.current[requestId]) return;
      clearTimeout(timeoutIdsRef.current[requestId]);
      delete timeoutIdsRef.current[requestId];
      delete pendingRequestsRef.current[requestId];
      toast.success("Test print job sent to hardware client successfully");
      setTestPrintLoading(false);
      setTestPrintOpen(false);
    });
    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      Object.values(timeoutIdsRef.current).forEach(clearTimeout);
      timeoutIdsRef.current = {};
      pendingRequestsRef.current = {};
    };
  }, [shopId]);

  // Load saved preference for the active tab
  useEffect(() => {
    if (!shopId) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await getUserPrintPreference(shopId, activeJobType);
        if (cancelled || !res?.success || !res?.data?.setUpId) return;
        const { setUpId, sessionId } = res.data;
        setPreferences((prev) => ({ ...prev, [activeJobType]: { setupId: setUpId, sessionId } }));
        setSelectedPrinters((prev) => ({ ...prev, [activeJobType]: setUpId }));
      } catch (err) {
        console.error("Error fetching printer preferences", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [shopId, activeJobType]);

  // Default-select first printer when list loads and nothing is selected
  useEffect(() => {
    if (loading || !printClients?.length) return;
    setSelectedPrinters((prev) => {
      if (prev[activeJobType] && printClients.some((p) => p._id === prev[activeJobType])) return prev;
      return { ...prev, [activeJobType]: printClients[0]._id };
    });
  }, [printClients, loading, activeJobType]);

  const hasCurrentPreference = Boolean(preferences[activeJobType]);

  async function handleSavePreference() {
    const currentSelection = selectedPrinters[activeJobType];
    if (!currentSelection) {
      toast.warning("Please select a printer first");
      return;
    }
    const printerObj = printClients.find((p) => p._id === currentSelection);
    if (!printerObj) {
      toast.error("Selected printer not found");
      return;
    }

    setSaveLoading(true);
    try {
      await setUserPreference(printerObj._id, printerObj.sessionId);
      toast.success(`Printer preference saved for ${getTabLabel(activeJobType)}`);
      setPreferences((prev) => ({
        ...prev,
        [activeJobType]: { setupId: printerObj._id, sessionId: printerObj.sessionId, name: printerObj.name },
      }));
      onSelect?.({ jobType: activeJobType, printer: printerObj });
    } catch (err) {
      console.error(err);
      toast.error("Failed to save printer preference");
    } finally {
      setSaveLoading(false);
    }
  }

  async function handleDeletePreference() {
    if (!confirm(`Delete the ${getTabLabel(activeJobType)} printer preference?`)) return;
    setDeleteLoading(true);
    try {
      await deleteUserPrintPreference(shopId, activeJobType);
      localStorage.removeItem(`printer_preference_${activeJobType}`);
      setPreferences((prev) => {
        const next = { ...prev };
        delete next[activeJobType];
        return next;
      });
      toast.success(`Printer preference for ${getTabLabel(activeJobType)} deleted`);
    } catch (err) {
      console.error(err);
      toast.error(`Failed to delete preference: ${err.message || ""}`);
    } finally {
      setDeleteLoading(false);
    }
  }

  async function createPrintJobDirectly(setupId, sessionId, numCopies, jobType) {
    const content = generatePrintContent(jobType, SAMPLE_PACKAGE);
    const fallbackHtml = `
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Test Print</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; font-family: Arial, sans-serif; }
          @media print {
            @page { size: auto auto; margin: 0; }
            body { width: auto; margin: 0; padding: 0; font-family: Arial, sans-serif; }
          }
        </style>
      </head>
      <body>${content}</body>
      </html>
    `;

    const requestId = Math.random().toString(36).substring(2, 15);
    pendingRequestsRef.current[requestId] = { timestamp: Date.now() };

    timeoutIdsRef.current[requestId] = setTimeout(() => {
      if (!pendingRequestsRef.current[requestId]) return;
      delete pendingRequestsRef.current[requestId];
      delete timeoutIdsRef.current[requestId];
      toast.warning("Hardware client did not respond. Opening browser print as fallback.");
      openBrowserPrint(content, jobType, numCopies);
      setTestPrintLoading(false);
      setTestPrintOpen(false);
    }, 8000);

    try {
      await createPrintJob({
        shopId,
        jobType,
        sessionId,
        numOfCopies: numCopies,
        setUpId: setupId,
        requestId,
        html: fallbackHtml,
        isTest: true,
      });
      // Success toast fires on the printJobPicked socket event
    } catch (err) {
      console.error("Failed to create print job:", err);
      delete pendingRequestsRef.current[requestId];
      clearTimeout(timeoutIdsRef.current[requestId]);
      delete timeoutIdsRef.current[requestId];
      toast.error("Failed to send job to hardware client. Opening browser print as fallback.");
      openBrowserPrint(content, jobType, numCopies);
      setTestPrintLoading(false);
      setTestPrintOpen(false);
    }
  }

  async function executeTestPrint() {
    if (!testPrintCopies || testPrintCopies <= 0) {
      toast.error("Number of copies must be a positive integer");
      return;
    }
    setTestPrintLoading(true);

    try {
      const res = await getUserPrintPreference(shopId, testPrintJobType);
      if (res?.success && res?.data?.setUpId && res?.data?.sessionId) {
        await createPrintJobDirectly(res.data.setUpId, res.data.sessionId, testPrintCopies, testPrintJobType);
      } else {
        toast.info(`No printer configuration found for ${getJobTypeDisplayName(testPrintJobType)}. Using browser print.`);
        openBrowserPrint(generatePrintContent(testPrintJobType, SAMPLE_PACKAGE), testPrintJobType, testPrintCopies);
        setTestPrintLoading(false);
        setTestPrintOpen(false);
      }
    } catch (err) {
      console.error("Error checking preference:", err);
      toast.warning("Failed to check printer configuration. Using browser print.");
      openBrowserPrint(generatePrintContent(testPrintJobType, SAMPLE_PACKAGE), testPrintJobType, testPrintCopies);
      setTestPrintLoading(false);
      setTestPrintOpen(false);
    }
  }

  function closeTestPrint() {
    Object.keys(pendingRequestsRef.current).forEach((requestId) => {
      clearTimeout(timeoutIdsRef.current[requestId]);
      delete timeoutIdsRef.current[requestId];
      delete pendingRequestsRef.current[requestId];
    });
    setTestPrintOpen(false);
    setTestPrintLoading(false);
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <Tabs value={activeJobType} onValueChange={setActiveJobType} className="flex min-h-0 flex-1 flex-col">
          <TabsList variant="line" className="w-full flex-wrap justify-start">
            {Object.values(JOB_TYPES).map((jobType) => (
              <TabsTrigger key={jobType} value={jobType} className="flex-none">
                {getTabLabel(jobType)}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeJobType} className="min-h-0 flex-1 overflow-y-auto pt-2">
            {loading ? (
              <div className="flex justify-center p-8 text-muted-foreground">Loading…</div>
            ) : error ? (
              <div className="p-4 text-red-500">Error: {error}</div>
            ) : !printClients?.length ? (
              <div className="flex justify-center p-8 text-muted-foreground">
                No printers found for this job type
              </div>
            ) : (
                <div className="flex flex-col gap-2">
                  {printClients.map((printer) => {
                    const isSelected = selectedPrinters[activeJobType] === printer._id;
                    return (
                      <div
                        key={printer._id}
                        onClick={() => setSelectedPrinters((prev) => ({ ...prev, [activeJobType]: printer._id }))}
                        className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                          isSelected
                            ? "border-primary/40 bg-primary-soft"
                            : "border-border bg-component-bg hover:bg-surface-alt"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            checked={isSelected}
                            onChange={() =>
                              setSelectedPrinters((prev) => ({ ...prev, [activeJobType]: printer._id }))
                            }
                            className="size-4 shrink-0 accent-primary"
                          />
                          <div className="min-w-0 flex-1">
                            <h4 className="mb-1 text-base font-medium text-text">{printer.name}</h4>
                            <div className="grid grid-cols-1 gap-1 text-sm text-muted-foreground sm:grid-cols-2 sm:gap-2">
                              <div>
                                <span className="font-medium text-text">Device:</span>{" "}
                                {printer.deviceProps?.deviceName || "N/A"}
                              </div>
                              <div>
                                <span className="font-medium text-text">IP Address:</span>{" "}
                                {printer.deviceProps?.ipAddress || "N/A"}
                              </div>
                              <div>
                                <span className="font-medium text-text">Platform:</span>{" "}
                                {printer.deviceProps?.meta?.platform || "N/A"}
                              </div>
                              <div>
                                <span className="font-medium text-text">Last Updated:</span>{" "}
                                {new Date(printer.updatedAt).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-col items-center gap-2">
                            {isSelected && <Badge className="bg-green-100 text-green-700">Selected</Badge>}
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTestPrintJobType(activeJobType);
                                setTestPrintOpen(true);
                              }}
                            >
                              Test Print
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border pt-3 sm:flex-row sm:justify-end">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          {hasCurrentPreference && (
            <Button variant="destructive" onClick={handleDeletePreference} disabled={deleteLoading}>
              {deleteLoading ? "Deleting…" : "Delete Preference"}
            </Button>
          )}
          <Button onClick={handleSavePreference} disabled={!selectedPrinters[activeJobType] || saveLoading}>
            {saveLoading ? "Saving…" : "Save Preference"}
          </Button>
        </div>
      </div>

      {/* Test Print dialog — stays a true modal even when this component is
          embedded in a Drawer tab, since it's a short-lived secondary action. */}
      <Dialog open={testPrintOpen} onOpenChange={(v) => (v ? setTestPrintOpen(true) : closeTestPrint())}>
        <DialogContent className="z-60 sm:max-w-125">
          <DialogHeader>
            <DialogTitle>Test Print — {getJobTypeDisplayName(testPrintJobType)}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            {printType === "hardware" && !socketConnected && (
              <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
                Warning: Print client appears to be offline. Will fallback to browser print if hardware print fails.
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-text">Number of Copies:</label>
              <Input
                type="number"
                min={1}
                max={10}
                value={testPrintCopies}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  setTestPrintCopies(Number.isNaN(v) ? 1 : Math.min(10, Math.max(1, v)));
                }}
              />
            </div>

            <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
              <h4 className="mb-2 text-sm font-medium text-blue-900">What will happen:</h4>
              <ol className="flex flex-col gap-1 text-sm text-blue-800">
                <li>1. System will check for printer configuration</li>
                <li>2. If hardware printer found, will attempt hardware print</li>
                <li>3. If no printer or hardware print fails, will open browser print dialog</li>
                <li>
                  4. Browser print will show formatted {getJobTypeDisplayName(testPrintJobType).toLowerCase()} ready
                  for printing
                </li>
              </ol>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeTestPrint} disabled={testPrintLoading}>
              Cancel
            </Button>
            <Button onClick={executeTestPrint} disabled={testPrintLoading}>
              {testPrintLoading
                ? "Printing…"
                : `Print ${testPrintCopies} ${testPrintCopies > 1 ? "copies" : "copy"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
