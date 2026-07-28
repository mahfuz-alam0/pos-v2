"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import DOMPurify from "dompurify";
import { Info, Loader2, X } from "lucide-react";

import { getSingleProduct } from "@/services/products/getSingleProduct";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ProductDetailsPanelProps {
  productId: string;
  productName?: string;
  onClose: () => void;
  onEdit: () => void;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-muted/40 p-3.5 ring-1 ring-foreground/10">
      <div className="mb-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</div>
      {children}
    </div>
  );
}

export default function ProductDetailsPanel({ productId, productName, onClose, onEdit }: ProductDetailsPanelProps) {
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!productId) return;
    setProduct(null);
    setLoading(true);
    getSingleProduct(productId)
      .then((res: any) => {
        const p = res?.data?.data?.product ?? res?.data?.product;
        if (!p) throw new Error("Product not found");
        setProduct(p);
      })
      .catch((err: any) => toast.error(err?.message || "Failed to load product details"))
      .finally(() => setLoading(false));
  }, [productId]);

  const cannabis = product?.cannabisProductData;
  const matrixId = product?.matrixInfo?.id ?? product?.matrixId;

  return (
    <div className="flex h-[80vh] flex-col overflow-hidden rounded-xl ring-1 ring-foreground/10">
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={onClose}>
            <X className="size-4" />
          </Button>
          <Button onClick={onEdit}>Edit</Button>
        </div>
      </div>
      <div className="h-px bg-border" />

      <div className="flex items-center gap-1.5 px-3 pt-2">
        <h1 className="text-lg font-semibold">{product?.name || productName}</h1>
        {matrixId && (
          <Tooltip>
            <TooltipTrigger
              className="inline-flex shrink-0"
              onClick={() => router.push(`/admin/catalog/products/matrix?matrixId=${matrixId}`)}
            >
              <Info className="size-3.5 animate-pulse text-blue-500" />
            </TooltipTrigger>
            <TooltipContent>Associated With Matrix</TooltipContent>
          </Tooltip>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {loading && (
          <div className="flex justify-center py-10">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && product && (
          <div className="flex flex-col gap-3">
            {product.images?.length > 0 && (
              <div className="flex gap-2">
                {product.images.map((img: any, i: number) => (
                  <img
                    key={i}
                    src={img.url}
                    alt={product.name}
                    className="size-20 rounded-lg object-cover ring-1 ring-foreground/10"
                  />
                ))}
              </div>
            )}

            <Section title="Basic Information">
              <Row label="Profile">{product.productProfile || "-"}</Row>
              <Row label="Category">
                {product.category ? (
                  <Badge
                    className="text-white"
                    style={{ backgroundColor: product.category.colorCode?.includes("fff") ? "#018FDE" : product.category.colorCode }}
                  >
                    {product.category.name}
                  </Badge>
                ) : "-"}
              </Row>
              <Row label="Brand">{product.brand?.name || "-"}</Row>
              <Row label="SKU">{product.sku || "-"}</Row>
              <Row label="EAN">{product.ean || "-"}</Row>
            </Section>

            <Section title="Weights">
              <Row label="Unit Weight">
                {product.unitWeight ? `${product.unitWeight} ${product.unitWeightUom?.name || ""}` : "-"}
              </Row>
              <Row label="Packaged Unit Weight">
                {product.packagedUnitWeight
                  ? `${product.packagedUnitWeight} ${product.packagedUnitWeightUom?.name || ""}`
                  : "-"}
              </Row>
            </Section>

            {(product.tags?.length > 0 || product.strains?.length > 0) && (
              <Section title="Classification">
                {product.strains?.length > 0 && (
                  <div className="mb-2">
                    <div className="mb-1 text-xs text-muted-foreground">Strains</div>
                    <div className="flex flex-wrap gap-1">
                      {product.strains.map((s: any, i: number) => (
                        <Badge key={i} variant="outline">{typeof s === "string" ? s : s.name}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {product.tags?.length > 0 && (
                  <div>
                    <div className="mb-1 text-xs text-muted-foreground">Tags</div>
                    <div className="flex flex-wrap gap-1">
                      {product.tags.map((t: any, i: number) => (
                        <Badge key={i} variant="outline">{typeof t === "string" ? t : t.name}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </Section>
            )}

            {cannabis && (
              <Section title="Cannabis Product Data">
                {cannabis.cannabisType && (
                  <Row label="Type">
                    {cannabis.cannabisType === "Other" ? cannabis.otherCannabisType : cannabis.cannabisType}
                  </Row>
                )}
                {cannabis.thcData?.value != null && (
                  <Row label="THC">
                    {cannabis.thcData.value}{cannabis.thcData.unit || "%"}
                    {cannabis.thcData.isRangeApplicable
                      ? ` (${cannabis.thcData.minimum ?? "-"}–${cannabis.thcData.maximum ?? "-"})`
                      : ""}
                  </Row>
                )}
                {cannabis.cbdData?.value != null && (
                  <Row label="CBD">
                    {cannabis.cbdData.value}{cannabis.cbdData.unit || "%"}
                    {cannabis.cbdData.isRangeApplicable
                      ? ` (${cannabis.cbdData.minimum ?? "-"}–${cannabis.cbdData.maximum ?? "-"})`
                      : ""}
                  </Row>
                )}
                {cannabis.effects?.length > 0 && (
                  <div className="mt-1.5">
                    <div className="mb-1 text-xs text-muted-foreground">Effects</div>
                    <div className="flex flex-wrap gap-1">
                      {cannabis.effects.map((e: string, i: number) => (
                        <Badge key={i} variant="outline">{e}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {cannabis.terpeneProfiles && Object.keys(cannabis.terpeneProfiles).length > 0 && (
                  <div className="mt-1.5">
                    <div className="mb-1 text-xs text-muted-foreground">Terpene Profiles</div>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(cannabis.terpeneProfiles).map(([key, val]) => (
                        <Badge key={key} variant="outline">{key}: {String(val)}%</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </Section>
            )}

            {product.details && (
              <Section title="Description">
                <div
                  className="text-sm text-foreground [&_p]:m-0 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_a]:text-primary [&_a]:underline [&_strong]:font-semibold"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(product.details) }}
                />
              </Section>
            )}

            {product.videoLinks?.length > 0 && (
              <Section title="Video Links">
                <div className="flex flex-col gap-1">
                  {product.videoLinks.map((link: string, i: number) => (
                    <a key={i} href={link} target="_blank" rel="noreferrer" className="truncate text-sm text-primary hover:underline">
                      {link}
                    </a>
                  ))}
                </div>
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
