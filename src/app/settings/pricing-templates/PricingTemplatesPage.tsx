"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil, X } from "lucide-react";

import { fetchPricingTemplates, fetchSinglePricingTemplate } from "@/services/pricingTemplates";
import { fetchUomList } from "@/services/uom/list";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import PricingTemplateDrawer from "./PricingTemplateDrawer";

interface Uom {
  id: string;
  name: string;
  shortForm: string;
}

interface PricingTier {
  buyMinimum: number;
  offAmount: number;
  displayUoMId: string;
}

interface PricingTemplate {
  id: string;
  name: string;
  description?: string;
  sellableUoMId: string;
  associatedShops?: { id: string; name: string }[];
  pricingInfo?: {
    unitPrice?: number;
    isTieredPricingApplicable?: boolean;
    tieredPricingMeasurementType?: string;
    tiers?: PricingTier[];
  };
  createdAt?: string;
  updatedAt?: string;
}

export default function PricingTemplatesPage() {
  const [templates, setTemplates] = useState<PricingTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [uomData, setUomData] = useState<Uom[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<PricingTemplate | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
    fetchUomData();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const shopId = JSON.parse(localStorage.getItem("shopId") || "null");
      const res = await fetchPricingTemplates(shopId, undefined);
      setTemplates(res?.data?.data?.templates ?? []);
    } catch {
      toast.error("Failed to fetch pricing templates");
    } finally {
      setLoading(false);
    }
  };

  const fetchUomData = async () => {
    try {
      const res = await fetchUomList();
      setUomData(res?.data?.data?.uoms ?? []);
    } catch {
      // non-critical; UoM names just won't resolve
    }
  };

  const handleTemplateClick = async (template: PricingTemplate) => {
    setDetailsLoading(true);
    try {
      const res = await fetchSinglePricingTemplate(template.id);
      setSelectedTemplate(res?.data?.data?.template ?? template);
    } catch {
      toast.error("Failed to fetch template details");
    } finally {
      setDetailsLoading(false);
    }
  };

  const getUomName = (uomId?: string) => {
    const uom = uomData.find((u) => u.id === uomId);
    return uom ? `${uom.name} (${uom.shortForm})` : "N/A";
  };

  const openAddDrawer = () => {
    setEditingTemplateId(null);
    setDrawerOpen(true);
  };

  const openEditDrawer = (templateId: string) => {
    setEditingTemplateId(templateId);
    setDrawerOpen(true);
  };

  const handleDrawerSaved = () => {
    setDrawerOpen(false);
    fetchTemplates();
    if (selectedTemplate) handleTemplateClick(selectedTemplate);
  };

  return (
    <div className="flex gap-6 p-6">
      <Card className={`flex-1 gap-4 p-4 ${selectedTemplate ? "max-w-[65%]" : ""}`}>
        <div className="flex items-center justify-between">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Settings</BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbItem>
                <BreadcrumbPage>Pricing Templates</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <Button onClick={openAddDrawer}>Add Template</Button>
        </div>

        <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
                    <TableCell colSpan={3}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : templates.length === 0 ? (
                <TableRow className="border-b-0">
                  <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                    No pricing templates found
                  </TableCell>
                </TableRow>
              ) : (
                templates.map((template, i) => (
                  <TableRow
                    key={template.id}
                    onClick={() => handleTemplateClick(template)}
                    className={`cursor-pointer border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : "bg-background"}`}
                  >
                    <TableCell className="font-medium text-primary">{template.name}</TableCell>
                    <TableCell>{template.description || "N/A"}</TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDrawer(template.id);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {selectedTemplate && (
        <div className="w-[35%] shrink-0">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-semibold">Template Details</h2>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => openEditDrawer(selectedTemplate.id)}>
                Edit
              </Button>
              <Button variant="outline" size="icon-sm" onClick={() => setSelectedTemplate(null)}>
                <X className="size-4" />
              </Button>
            </div>
          </div>

          {detailsLoading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <Card className="gap-3 p-4">
                <p className="text-sm font-semibold">Basic Information</p>
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="font-medium">Name:</span>
                    <span className="truncate">{selectedTemplate.name}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="font-medium">Description:</span>
                    <span className="truncate">{selectedTemplate.description || "N/A"}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="font-medium">Unit of Measurement:</span>
                    <span className="truncate">{getUomName(selectedTemplate.sellableUoMId)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="font-medium">Unit Price:</span>
                    <span>${selectedTemplate.pricingInfo?.unitPrice || 0}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-medium">Tiered Pricing:</span>
                    <Badge variant={selectedTemplate.pricingInfo?.isTieredPricingApplicable ? "default" : "secondary"}>
                      {selectedTemplate.pricingInfo?.isTieredPricingApplicable ? "Yes" : "No"}
                    </Badge>
                  </div>
                  {selectedTemplate.createdAt && (
                    <div className="flex justify-between gap-4">
                      <span className="font-medium">Created:</span>
                      <span>{new Date(selectedTemplate.createdAt).toLocaleDateString()}</span>
                    </div>
                  )}
                  {selectedTemplate.updatedAt && (
                    <div className="flex justify-between gap-4">
                      <span className="font-medium">Last Updated:</span>
                      <span>{new Date(selectedTemplate.updatedAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </Card>

              <Card className="gap-3 p-4">
                <p className="text-sm font-semibold">Associated Shops</p>
                {selectedTemplate.associatedShops?.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTemplate.associatedShops.map((shop) => (
                      <Badge key={shop.id} variant="secondary">
                        {shop.name}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">No shops associated</span>
                )}
              </Card>

              {selectedTemplate.pricingInfo?.isTieredPricingApplicable && (selectedTemplate.pricingInfo?.tiers?.length ?? 0) > 0 && (
                <Card className="gap-3 p-4">
                  <p className="text-sm font-semibold">Tiered Pricing Details</p>
                  <div className="flex flex-col gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">Measurement Type:</span>
                      <span>{selectedTemplate.pricingInfo?.tieredPricingMeasurementType || "QUANTITY"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Number of Tiers:</span>
                      <span>{selectedTemplate.pricingInfo?.tiers?.length || 0}</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {selectedTemplate.pricingInfo?.tiers?.map((tier, index) => {
                        const tierUom = uomData.find((u) => u.id === tier.displayUoMId);
                        return (
                          <div key={index} className="rounded-lg bg-muted p-2.5">
                            <p className="mb-1 font-medium">Tier {index + 1}</p>
                            <div className="flex flex-col gap-1 text-xs">
                              <div className="flex justify-between">
                                <span>Minimum Quantity:</span>
                                <span className="font-medium">
                                  {tier.buyMinimum} {tierUom?.shortForm || "units"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Price per Unit:</span>
                                <span className="font-medium text-emerald-600">${tier.offAmount}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Total for Min Qty:</span>
                                <span className="font-medium text-primary">${(tier.buyMinimum * tier.offAmount).toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      <PricingTemplateDrawer
        open={drawerOpen}
        templateId={editingTemplateId}
        onClose={() => setDrawerOpen(false)}
        onSaved={handleDrawerSaved}
      />
    </div>
  );
}
