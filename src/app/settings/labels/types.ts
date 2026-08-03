export interface LabelModel {
  id: string;
  name: string;
  templateType: string;
  templateId: string;
  preferredModelType?: string | null;
  preferredModelID?: string | null;
  fieldExclusions: string[];
  meta?: { barcodeDigits?: string };
}

export interface PrintTemplate {
  id: string;
  name: string;
  type: string;
  shopId?: string | null;
  templateHtml: string;
  dimensions: { width: number; height: number };
  margins: { top: number; right: number; bottom: number; left: number };
}
