// PDF417 barcode decoding from a DL-back image (ported from old POS).
// Strategy: native BarcodeDetector when it supports pdf417, then zxing-wasm
// full-frame, then zxing-wasm over crop bands matching typical AAMVA layouts.

let _barcodeDetector = null;
let _zxingReader = null;

async function getZXingReader() {
  if (_zxingReader) return _zxingReader;
  const mod = await import("zxing-wasm/reader");
  // WASM binary is copied to /public so it loads on any route.
  mod.setZXingModuleOverrides({ locateFile: (f) => "/" + f });
  _zxingReader = mod.readBarcodesFromImageData;
  return _zxingReader;
}

async function decodeViaZXingWasm(img) {
  try {
    const readBarcodesFromImageData = await getZXingReader();
    const W = img.naturalWidth || img.width;
    const H = img.naturalHeight || img.height;

    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    const results = await readBarcodesFromImageData(ctx.getImageData(0, 0, W, H), {
      formats: ["PDF417"],
      textMode: "Plain",
    });
    if (results.length > 0 && results[0].text?.length > 30) return results[0].text;

    // Crop bands matching a PDF417's ~3:1–4:1 aspect ratio and typical
    // positions on an AAMVA card back; broader zones as fallback.
    const crops = [
      [0.04, 0.5, 0.75, 0.26, 1],
      [0.04, 0.35, 0.75, 0.26, 1],
      [0.04, 0.62, 0.75, 0.26, 1],
      [0, 0.45, 0.6, 0.45, 2],
      [0, 0.38, 0.75, 0.52, 1],
      [0, 0.35, 1, 0.6, 1],
      [0, 0.28, 1, 0.68, 1],
      [0, 0.4, 0.55, 0.55, 2],
    ];

    for (const [xf, yf, wf, hf, scale] of crops) {
      const cw = Math.round(wf * W * scale);
      const ch = Math.round(hf * H * scale);
      const c = document.createElement("canvas");
      c.width = cw;
      c.height = ch;
      c.getContext("2d").drawImage(
        img,
        Math.round(xf * W),
        Math.round(yf * H),
        Math.round(wf * W),
        Math.round(hf * H),
        0,
        0,
        cw,
        ch
      );
      const r = await readBarcodesFromImageData(c.getContext("2d").getImageData(0, 0, cw, ch), {
        formats: ["PDF417"],
        textMode: "Plain",
      });
      if (r.length > 0 && r[0].text?.length > 30) return r[0].text;
    }
  } catch (err) {
    console.warn("[zxing-wasm] error:", err.message);
  }
  return null;
}

export async function decodeBarcodeFromImage(img) {
  // Native BarcodeDetector — pdf417 supported on Linux/Android Chrome only.
  if (typeof window !== "undefined" && "BarcodeDetector" in window) {
    try {
      const supported = await window.BarcodeDetector.getSupportedFormats();
      if (supported.includes("pdf417")) {
        if (!_barcodeDetector) {
          _barcodeDetector = new window.BarcodeDetector({ formats: ["pdf417"] });
        }
        const found = await _barcodeDetector.detect(img);
        const hit = found.find((b) => b.format === "pdf417" && b.rawValue?.length > 50);
        if (hit) return hit.rawValue;
      }
    } catch {}
  }

  return decodeViaZXingWasm(img);
}

// Single live-scan attempt on the current video frame: native detector when
// available, else zxing-wasm over a sweeping lower band (PDF417 sits on the
// lower-left of an AAMVA card back). Returns raw text or null.
const LIVE_BANDS = [
  [0.0, 0.35, 1, 0.4],
  [0.0, 0.5, 1, 0.4],
  [0.0, 0.2, 1, 0.4],
  [0.0, 0.0, 1, 1],
];

export async function decodeVideoFrame(video, frameIndex = 0) {
  if (!video?.videoWidth) return null;

  if (typeof window !== "undefined" && "BarcodeDetector" in window) {
    try {
      const supported = await window.BarcodeDetector.getSupportedFormats();
      if (supported.includes("pdf417")) {
        if (!_barcodeDetector) {
          _barcodeDetector = new window.BarcodeDetector({ formats: ["pdf417"] });
        }
        const found = await _barcodeDetector.detect(video);
        const hit = found.find((b) => b.format === "pdf417" && b.rawValue?.length > 50);
        if (hit) return hit.rawValue;
      }
    } catch {}
  }

  try {
    const readBarcodesFromImageData = await getZXingReader();
    const W = video.videoWidth;
    const H = video.videoHeight;
    const [xf, yf, wf, hf] = LIVE_BANDS[frameIndex % LIVE_BANDS.length];
    const cw = Math.round(wf * W);
    const ch = Math.round(hf * H);
    const c = document.createElement("canvas");
    c.width = cw;
    c.height = ch;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(video, Math.round(xf * W), Math.round(yf * H), cw, ch, 0, 0, cw, ch);
    const r = await readBarcodesFromImageData(ctx.getImageData(0, 0, cw, ch), {
      formats: ["PDF417"],
      textMode: "Plain",
    });
    if (r.length > 0 && r[0].text?.length > 30) return r[0].text;
  } catch {}
  return null;
}

export function preloadZXing() {
  getZXingReader().catch(() => {});
}

export function loadImageFromSrc(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
