"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";

import AttributesTable from "./AttributesTable";
import TemplatesTable from "./TemplatesTable";
import AttributeFormDrawer from "./AttributeFormDrawer";
import TemplateFormDrawer from "./TemplateFormDrawer";

export default function MatrixTabs() {
  const searchParams = useSearchParams();
  const matrixId = searchParams.get("matrixId");

  const [tab, setTab] = useState(matrixId ? "templates" : "attributes");

  const [attributeDrawer, setAttributeDrawer] = useState<{
    open: boolean;
    mode: "add" | "edit";
    attributeId: string | number | null;
  }>({ open: false, mode: "add", attributeId: null });

  const [templateDrawer, setTemplateDrawer] = useState<{
    open: boolean;
    mode: "add" | "edit";
    templateId: string | number | null;
  }>({ open: false, mode: "add", templateId: null });

  const [attributesRefreshKey, setAttributesRefreshKey] = useState(0);
  const [templatesRefreshKey, setTemplatesRefreshKey] = useState(0);

  useEffect(() => {
    if (matrixId) {
      setTab("templates");
      setTemplateDrawer({ open: true, mode: "edit", templateId: matrixId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matrixId]);

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Catalog</BreadcrumbPage>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbPage>{tab === "attributes" ? "Attributes" : "Product Matrices"}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {tab === "attributes" ? (
          <Button onClick={() => setAttributeDrawer({ open: true, mode: "add", attributeId: null })}>
            <Plus /> Add Attribute
          </Button>
        ) : (
          <Button onClick={() => setTemplateDrawer({ open: true, mode: "add", templateId: null })}>
            <Plus /> Add Product Matrices
          </Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as string)}>
        <TabsList>
          <TabsTrigger value="attributes">Attributes</TabsTrigger>
          <TabsTrigger value="templates">Product Matrices</TabsTrigger>
        </TabsList>

        <TabsContent value="attributes">
          <AttributesTable
            refreshKey={attributesRefreshKey}
            onEdit={(id) => setAttributeDrawer({ open: true, mode: "edit", attributeId: id })}
          />
        </TabsContent>

        <TabsContent value="templates">
          <TemplatesTable
            refreshKey={templatesRefreshKey}
            onEdit={(id) => setTemplateDrawer({ open: true, mode: "edit", templateId: id })}
          />
        </TabsContent>
      </Tabs>

      <AttributeFormDrawer
        open={attributeDrawer.open}
        mode={attributeDrawer.mode}
        attributeId={attributeDrawer.attributeId}
        onClose={() => setAttributeDrawer((prev) => ({ ...prev, open: false }))}
        onSaved={() => setAttributesRefreshKey((k) => k + 1)}
      />

      <TemplateFormDrawer
        open={templateDrawer.open}
        mode={templateDrawer.mode}
        templateId={templateDrawer.templateId}
        onClose={() => setTemplateDrawer((prev) => ({ ...prev, open: false }))}
        onSaved={() => setTemplatesRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
