"use client";

import Barcode from "react-barcode";

// Fixed-layout compliance label (exit label / package label) for a single
// cart line's package. Legacy (hooks/usePrint.jsx) builds this from a
// per-shop, admin-configurable template — that template designer doesn't
// exist in this port, so this mirrors Receipt.tsx's approach: a fixed
// layout covering the fields that matter (product, batch/package id +
// barcode, THC/CBD), not the full field-position/font editor.
export default function PackageLabel({ packageData, productData, labelType = "EXIT_LABEL" }) {
  if (!packageData) return null;

  const productName = productData?.name || packageData?.name || "N/A";
  const packageIdValue = String(packageData?.advertisedId || packageData?.id || "");

  const formatCannabinoid = (name, data) => {
    if (!data) return null;
    const unit = data.unit || "%";
    if (data.isRangeApplicable) {
      return `${name}: ${data.minimum ?? 0}-${data.maximum ?? 0}${unit}`;
    }
    return `${name}: ${data.value ?? 0}${unit}`;
  };

  const thcLine = formatCannabinoid("THC", productData?.cannabisProductData?.thcData);
  const cbdLine = formatCannabinoid("CBD", productData?.cannabisProductData?.cbdData);

  return (
    <div style={{ fontFamily: "Arial, sans-serif", fontSize: 11, width: 288, color: "#000", background: "#fff", padding: 6 }}>
      <div style={{ textAlign: "center", fontWeight: "bold", fontSize: 12, marginBottom: 4 }}>
        {labelType === "EXIT_LABEL" ? "EXIT LABEL" : "PACKAGE LABEL"}
      </div>
      <div style={{ fontWeight: "bold" }}>{productName}</div>
      {(thcLine || cbdLine) && (
        <div style={{ marginTop: 2 }}>
          {thcLine && <div>{thcLine}</div>}
          {cbdLine && <div>{cbdLine}</div>}
        </div>
      )}
      <div style={{ marginTop: 4 }}>Package ID: {packageIdValue}</div>
      <div style={{ display: "flex", justifyContent: "center", marginTop: 6 }}>
        <Barcode value={packageIdValue || "0"} renderer="svg" width={1.3} height={36} fontSize={10} />
      </div>
    </div>
  );
}
