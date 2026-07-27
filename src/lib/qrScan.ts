// Live QR-code decoding from a video frame: native BarcodeDetector when
// available, else zxing-wasm full-frame decode. Separate reader instance
// from dlBarcode.ts (that one is pinned to PDF417 for DL scanning).

let _qrReader = null;

async function getQrReader() {
  if (_qrReader) return _qrReader;
  const mod = await import("zxing-wasm/reader");
  mod.setZXingModuleOverrides({ locateFile: (f) => "/" + f });
  _qrReader = mod.readBarcodesFromImageData;
  return _qrReader;
}

export function preloadQrReader() {
  getQrReader().catch(() => {});
}

export async function decodeQrFromVideoFrame(video) {
  if (!video?.videoWidth) return null;

  if (typeof window !== "undefined" && "BarcodeDetector" in window) {
    try {
      const supported = await (window as any).BarcodeDetector.getSupportedFormats();
      if (supported.includes("qr_code")) {
        const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
        const found = await detector.detect(video);
        if (found[0]?.rawValue) return found[0].rawValue;
        return null;
      }
    } catch {}
  }

  try {
    const readBarcodesFromImageData = await getQrReader();
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(video, 0, 0);
    const results = await readBarcodesFromImageData(
      ctx.getImageData(0, 0, canvas.width, canvas.height),
      { formats: ["QRCode"], textMode: "Plain" }
    );
    return results[0]?.text || null;
  } catch {
    return null;
  }
}
