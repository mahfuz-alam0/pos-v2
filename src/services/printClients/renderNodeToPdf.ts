const PX_TO_MM = 25.4 / 96;

export interface RenderedPdf {
  bytes: number[];
  widthMm: number;
  heightMm: number;
}

// Rasterizes an off-screen print node (the portaled #pos-label-print-area /
// #order-ahead-print-area content in PrintLabelModal / PrintOrderModal) into
// a single-page PDF sized to the node's own rendered footprint, so the local
// printer gets the label/receipt at its real physical size instead of being
// scaled into A4/Letter. Same html2canvas + jsPDF pipeline already used by
// pdf-export-drawer.tsx's "Download PDF" (proven to work on an
// off-screen/absolutely-positioned node), just single-page since these print
// areas are fixed layouts meant to fit on one page.
export async function renderNodeToPdf(node: HTMLElement): Promise<RenderedPdf> {
  const [{ jsPDF }, html2canvasModule] = await Promise.all([import("jspdf"), import("html2canvas")]);
  const html2canvas = (html2canvasModule as any).default || html2canvasModule;

  const rect = node.getBoundingClientRect();
  const widthMm = Math.max(1, rect.width * PX_TO_MM);
  const heightMm = Math.max(1, rect.height * PX_TO_MM);

  const canvas = await html2canvas(node, {
    scale: 3,
    logging: false,
    useCORS: true,
    allowTaint: true,
    width: Math.round(rect.width),
    windowWidth: Math.round(rect.width),
  });

  const pdf = new jsPDF({ unit: "mm", format: [widthMm, heightMm] });
  const imgData = canvas.toDataURL("image/png");
  pdf.addImage(imgData, "PNG", 0, 0, widthMm, heightMm);

  const buffer = pdf.output("arraybuffer") as ArrayBuffer;
  return { bytes: Array.from(new Uint8Array(buffer)), widthMm, heightMm };
}
