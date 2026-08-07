// Live barcode/QR decoding from a video frame for general product-barcode
// scanning (feeds the "Scan package id" field). Tries every common 1D/2D
// symbology since package barcodes vary by generator (Code128/EAN/UPC linear
// barcodes as well as QR) — native BarcodeDetector when it supports one of
// them, else zxing-wasm full-frame decode with "AllReadable" (every
// symbology zxing supports, in one pass). Separate reader instance from
// qrScan.ts (pinned to QR only, used for the login QR scan) and dlBarcode.ts
// (pinned to PDF417 for DL-back scanning).

let _reader = null;

async function getReader() {
  if (_reader) return _reader;
  const mod = await import("zxing-wasm/reader");
  // WASM binary is copied to /public so it loads on any route.
  mod.setZXingModuleOverrides({ locateFile: (f) => "/" + f });
  _reader = mod.readBarcodesFromImageData;
  return _reader;
}

export function preloadBarcodeReader() {
  getReader().catch(() => {});
}

const NATIVE_FORMATS = [
  "qr_code",
  "code_128",
  "code_39",
  "code_93",
  "codabar",
  "ean_13",
  "ean_8",
  "itf",
  "upc_a",
  "upc_e",
  "pdf417",
  "aztec",
  "data_matrix",
];

export async function decodeBarcodeFromVideoFrame(video) {
  if (!video?.videoWidth) return null;

  if (typeof window !== "undefined" && "BarcodeDetector" in window) {
    try {
      const supported = await (
        window as any
      ).BarcodeDetector.getSupportedFormats();
      const formats = NATIVE_FORMATS.filter((f) => supported.includes(f));
      if (formats.length > 0) {
        const detector = new (window as any).BarcodeDetector({ formats });
        const found = await detector.detect(video);
        if (found[0]?.rawValue) return found[0].rawValue;
        return null;
      }
    } catch {}
  }

  try {
    const readBarcodesFromImageData = await getReader();
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(video, 0, 0);
    const results = await readBarcodesFromImageData(
      ctx.getImageData(0, 0, canvas.width, canvas.height),
      { formats: ["AllReadable"], textMode: "Plain" },
    );
    return results[0]?.text || null;
  } catch {
    return null;
  }
}
