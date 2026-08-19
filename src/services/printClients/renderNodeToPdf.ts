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
  /**
   * Optional inset describing the part of the page the head can actually ink
   * (see PrinterMedia). Omitted means the whole page images, which is what a
   * queue with no PPD to read has to assume.
   */
  printableLeftMm?: number;
  printableTopMm?: number;
  printableWidthMm?: number;
  printableHeightMm?: number;
}

export interface RenderNodeOptions {
  /**
   * Blank stock to leave down the left and right edges, in mm. Defaults to 0,
   * which prints the artwork edge to edge.
   */
  sideMarginMm?: number;
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
// path, where the browser's own dialog owns the paper.
//
// Given a `page`, the artwork is fitted to it rather than allowed to hang off
// the edge: the stock is what the printer can actually image, so anything
// beyond it is dropped, not printed on some larger sheet. See the body.
export async function renderNodeToPdf(
  node: HTMLElement,
  page?: PdfPageSize | null,
  options: RenderNodeOptions = {}
): Promise<RenderedPdf> {
  const [{ jsPDF }, { canvas, rect }] = await Promise.all([import("jspdf"), rasterizeNode(node)]);

  const naturalWidthMm = Math.max(1, rect.width * PX_TO_MM);
  const naturalHeightMm = Math.max(1, rect.height * PX_TO_MM);

  // The page is the physical stock and cannot grow, so a side margin has to
  // come out of the artwork instead.
  const sideMarginMm = Math.max(0, options.sideMarginMm ?? 0);

  const widthMm = page ? page.widthMm : naturalWidthMm;

  // Fit and place against the printable box, not the page. They are the same
  // rectangle on label stock, but on a receipt roll the page is the 80mm paper
  // while the head only reaches ~72mm of it — and artwork fitted to the page
  // would still lose its right-hand column to that difference.
  const printableLeftMm = page?.printableLeftMm ?? 0;
  const printableTopMm = page?.printableTopMm ?? 0;
  const printableWidthMm = page?.printableWidthMm ?? widthMm;
  const usableWidthMm = Math.max(1, printableWidthMm - 2 * sideMarginMm);
  // Only real stock caps the height. An artwork-sized page has no ceiling to
  // fit into — it becomes whatever the artwork ends up being, below.
  const heightLimitMm = page ? page.printableHeightMm ?? page.heightMm : Infinity;

  // Artwork too big for its stock used to get a page cut to the artwork
  // instead, on the reasoning that an oversized page at least prints the whole
  // thing. It does not. The page size is a request, not a promise: the printer
  // still only images the stock it has, so the overhang was simply dropped —
  // which is what was beheading the receipt's right-hand column and leaving
  // just the leading "$" of each amount.
  //
  // Scaling it down to fit is what actually prints all of it. One factor for
  // both axes so nothing is distorted, and clamped to 1 so this only ever
  // shrinks — artwork smaller than its stock is inset, never magnified to fill.
  const scale = Math.min(1, usableWidthMm / naturalWidthMm, heightLimitMm / naturalHeightMm);
  const artworkWidthMm = naturalWidthMm * scale;
  const artworkHeightMm = naturalHeightMm * scale;

  // Real stock keeps its own height — on die-cut labels that height is the
  // pitch the gap sensor is programmed with. An artwork-sized page follows the
  // artwork instead, so shrinking for a side margin does not leave a matching
  // strip of blank stock hanging off the bottom.
  const heightMm = page ? page.heightMm : artworkHeightMm;

  const pdf = new jsPDF({ unit: "mm", format: [widthMm, heightMm] });
  const imgData = canvas.toDataURL("image/png");
  // jsPDF's origin is the top-left corner of the page, so the artwork is placed
  // at the top-left of the *printable* box within it, inset by any side margin,
  // leaving unused stock below and to the right.
  pdf.addImage(
    imgData,
    "PNG",
    printableLeftMm + sideMarginMm,
    printableTopMm,
    artworkWidthMm,
    artworkHeightMm
  );

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
