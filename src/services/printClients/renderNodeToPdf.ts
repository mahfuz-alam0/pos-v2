const PX_TO_MM = 25.4 / 96;

export interface RenderedPdf {
  bytes: number[];
  widthMm: number;
  heightMm: number;
}

async function rasterizeNode(node: HTMLElement) {
  const html2canvasModule = await import("html2canvas");
  const html2canvas = (html2canvasModule as any).default || html2canvasModule;

  const rect = node.getBoundingClientRect();
  const canvas = await html2canvas(node, {
    scale: 3,
    logging: false,
    useCORS: true,
    allowTaint: true,
    width: Math.round(rect.width),
    windowWidth: Math.round(rect.width),
  });

  return { canvas, rect };
}

export interface PdfPageSize {
  widthMm: number;
  heightMm: number;
}

// Rasterizes an off-screen print node (the portaled #pos-label-print-area /
// #order-ahead-print-area content in PrintLabelModal / PrintOrderModal) into a
// single-page PDF, so the local printer gets the label/receipt at its real
// physical size instead of being scaled into A4/Letter. Same html2canvas +
// jsPDF pipeline already used by pdf-export-drawer.tsx's "Download PDF"
// (proven to work on an off-screen/absolutely-positioned node), just
// single-page since these print areas are fixed layouts meant to fit on one
// page.
//
// `page` is the media the job will actually print on (get_local_printer_media
// reads it off the queue). When given, the artwork is placed at the top-left
// of a page that size rather than being made into a page of its own — which is
// exactly what a browser does when it prints this same PDF at 100% scale onto
// "4 x 6 in" paper, the output that was already coming out pixel-perfect.
//
// That distinction is load-bearing on a label printer. Media is not a layout
// hint there: it becomes a TSPL `SIZE w mm, h mm` that tells the gap sensor the
// label pitch. A page cut to the artwork makes the printer advance by the
// artwork height instead of the label height, so it prints one short window and
// then loses registration — the whole label never lands on one label. Omitting
// `page` keeps the artwork-sized page, which is right for the browser print
// path and for continuous/roll media with no fixed pitch.
export async function renderNodeToPdf(node: HTMLElement, page?: PdfPageSize | null): Promise<RenderedPdf> {
  const [{ jsPDF }, { canvas, rect }] = await Promise.all([import("jspdf"), rasterizeNode(node)]);

  const artworkWidthMm = Math.max(1, rect.width * PX_TO_MM);
  const artworkHeightMm = Math.max(1, rect.height * PX_TO_MM);

  // Only honour the stock size if the artwork actually fits on it — otherwise
  // the overhang would be cropped, and an artwork-sized page at least prints
  // the whole thing. The 0.5mm slack absorbs px→mm rounding on an exact fit.
  const fitsStock =
    !!page && page.widthMm + 0.5 >= artworkWidthMm && page.heightMm + 0.5 >= artworkHeightMm;
  const widthMm = fitsStock ? page!.widthMm : artworkWidthMm;
  const heightMm = fitsStock ? page!.heightMm : artworkHeightMm;

  const pdf = new jsPDF({ unit: "mm", format: [widthMm, heightMm] });
  const imgData = canvas.toDataURL("image/png");
  // jsPDF's origin is the top-left corner, so this anchors the artwork there
  // and leaves any unused stock below/right of it — never scaled to fill.
  pdf.addImage(imgData, "PNG", 0, 0, artworkWidthMm, artworkHeightMm);

  const buffer = pdf.output("arraybuffer") as ArrayBuffer;
  return { bytes: Array.from(new Uint8Array(buffer)), widthMm, heightMm };
}

export interface RenderedImage {
  dataUrl: string;
  widthPx: number;
  heightPx: number;
}

// Same rasterization as renderNodeToPdf, but handed back as a plain image —
// used for the in-app "Check Label" preview on the Tauri desktop build,
// where there's no OS print-preview popup to fall back to the way a
// browser's window.print() gives you one (see printPdfInBrowser below).
export async function renderNodeToImage(node: HTMLElement): Promise<RenderedImage> {
  const { canvas, rect } = await rasterizeNode(node);
  return { dataUrl: canvas.toDataURL("image/png"), widthPx: rect.width, heightPx: rect.height };
}

// "Check Label"/browser-print fallback, but printing the same PDF the
// local-hardware path (printPdfToLocalPrinter) would receive instead of
// asking the browser to paginate the live DOM itself. Handing the browser's
// print dialog an actual PDF sized to its own page (see renderNodeToPdf
// above) means whatever prints is exactly what a real printer would get —
// no separate @page/CSS layout to keep in sync with the PDF path, and it
// doubles as a way to visually confirm the generated PDF itself is correct
// before blaming the printer driver for any misalignment.
export async function printPdfInBrowser(node: HTMLElement): Promise<void> {
  const { bytes } = await renderNodeToPdf(node);
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";

  await new Promise<void>((resolve) => {
    iframe.onload = () => resolve();
    iframe.src = url;
    document.body.appendChild(iframe);
  });

  iframe.contentWindow?.focus();
  iframe.contentWindow?.print();

  // The print dialog is async and non-blocking from here — tear the iframe
  // down well after it would have opened rather than immediately, since an
  // instant removal cancels the print on some browsers/webviews.
  setTimeout(() => {
    iframe.remove();
    URL.revokeObjectURL(url);
  }, 60000);
}
