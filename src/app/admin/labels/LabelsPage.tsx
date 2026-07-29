"use client";

import { useState } from "react";

import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import LabelsTable from "./LabelsTable";
import TemplatesTable from "./TemplatesTable";

export default function LabelsPage() {
  const [activeTab, setActiveTab] = useState("labels");

  return (
    <div className="flex flex-col gap-4 p-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Settings</BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbPage>Labels & Receipts</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="labels">Labels & Receipts</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="labels">
          <LabelsTable />
        </TabsContent>

        <TabsContent value="templates">
          <TemplatesTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
