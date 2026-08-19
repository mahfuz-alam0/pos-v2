"use client";

/**
 * Printable manifest for a METRC transfer — the new-POS equivalent of old's
 * `transferManifestTemplate(data, "metrcTransfers")`, which built an HTML
 * string and handed it to `usePrintCustom`. Neither of those exist here, so
 * this renders the same document as JSX and prints it with the technique
 * already used for receipts (see `printNode` in PrintReceiptModal): keep the
 * node off-screen, then isolate it with a print-only stylesheet.
 *
 * Deliberately styled with fixed colors rather than theme tokens — this only
 * ever goes to paper, where the viewer's light/dark preference is irrelevant.
 */

export const MANIFEST_PRINT_ID = "metrc-transfer-manifest-print-area";

export function printManifest() {
  const styleId = "metrc-transfer-manifest-print-styles";
  document.getElementById(styleId)?.remove();

  const style = document.createElement("style");
  style.id = styleId;
  style.innerHTML = `
    @media print {
      body * { visibility: hidden; }
      #${MANIFEST_PRINT_ID}, #${MANIFEST_PRINT_ID} * { visibility: visible; }
      /* !important: the container's inline off-screen positioning would
         otherwise outrank this and print a blank page. */
      #${MANIFEST_PRINT_ID} {
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
      }
    }
  `;
  document.head.appendChild(style);
  window.print();
}

function formatDateTime(value?: string) {
  if (!value) return "N/A";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "N/A" : date.toLocaleString();
}

export default function TransferManifest({ transfer }: { transfer: any }) {
  if (!transfer) return null;

  const snapshot = transfer?.defSnapshot ?? {};
  const packages = transfer?.packages ?? [];

  const totalItems = packages.reduce(
    (sum: number, pkg: any) => sum + (Number(pkg?.snapshotData?.ShippedQuantity) || 0),
    0
  );

  const rowStyle: React.CSSProperties = {
    display: "flex",
    gap: 12,
    padding: "6px 0",
    borderTop: "1px solid #e2e2e2",
  };

  return (
    <div
      id={MANIFEST_PRINT_ID}
      // Off-screen until a print is requested.
      style={{ position: "fixed", left: -9999, top: 0, width: "7in", color: "#000", background: "#fff" }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 24, fontSize: 12 }}>
        <div>
          <div style={{ padding: "14px 20px", background: "#eaeaea", border: "1px solid #b8b8b8", fontWeight: 700 }}>
            Inventory Transfer #{transfer?.advertisedId ?? transfer?.metrcId ?? "-"}
          </div>
          <div style={{ border: "1px solid #b8b8b8", borderTop: "none", padding: "10px 20px" }}>
            <p style={{ margin: "4px 0" }}>
              <b>Created At: </b>
              {formatDateTime(snapshot?.CreatedDateTime)}
            </p>
            <p style={{ margin: "4px 0" }}>
              <b>Created By: </b>
              {snapshot?.CreatedByUserName ?? "N/A"}
            </p>
            <p style={{ margin: "4px 0" }}>
              <b>From Location: </b>
              {snapshot?.ShipperFacilityName ?? "N/A"}
            </p>
            <p style={{ margin: "4px 0" }}>
              <b>To Location: </b>
              {snapshot?.RecipientFacilityName ?? "N/A"}
            </p>
            {transfer?.metrcManifestNumber && (
              <p style={{ margin: "4px 0" }}>
                <b>Metrc Manifest Number: </b>
                {transfer.metrcManifestNumber}
              </p>
            )}
            <p style={{ margin: "4px 0" }}>
              <b>Total Items Transferred: </b>
              {totalItems || "N/A"}
            </p>
          </div>
        </div>

        <div>
          <div style={{ padding: "14px 20px", background: "#eaeaea", border: "1px solid #b8b8b8", fontWeight: 700 }}>
            Packages
          </div>
          <div style={{ border: "1px solid #b8b8b8", borderTop: "none", padding: "10px 20px" }}>
            <div style={{ ...rowStyle, borderTop: "none", fontWeight: 700 }}>
              <div style={{ flex: 2 }}>Package Details</div>
              <div style={{ flex: 1, textAlign: "center" }}>Amount</div>
              <div style={{ flex: 1, textAlign: "center" }}>Total Value</div>
            </div>
            {packages.map((pkg: any, index: number) => (
              <div key={pkg?.metrcId ?? index} style={rowStyle}>
                <div style={{ flex: 2 }}>
                  <p style={{ margin: 0 }}>{pkg?.snapshotData?.ProductName ?? "-"}</p>
                  <p style={{ margin: 0, fontStyle: "italic" }}>{pkg?.metrcId ?? "-"}</p>
                </div>
                <div style={{ flex: 1, textAlign: "center" }}>{pkg?.snapshotData?.ShippedQuantity ?? "-"}</div>
                <div style={{ flex: 1, textAlign: "center" }}>-</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
