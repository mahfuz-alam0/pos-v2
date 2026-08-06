"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Plus } from "lucide-react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import LabelsTable from "./LabelsTable";
import TemplatesTable, { type TemplatesTableHandle } from "./TemplatesTable";

export default function LabelsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("labels");
  const templatesTableRef = useRef<TemplatesTableHandle>(null);

  return (
    <div className="flex flex-col gap-4 p-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Settings</BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Labels & Receipts</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="labels">Labels & Receipts</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          {activeTab === "labels" ? (
            <Button onClick={() => router.push("/settings/labels/add")}>
              <Plus /> Create Custom Package Label
            </Button>
          ) : (
            <Button onClick={() => templatesTableRef.current?.openCreate()}>
              <Plus /> Add Template
            </Button>
          )}
        </div>

        <TabsContent value="labels">
          <LabelsTable />
        </TabsContent>

        <TabsContent value="templates">
          <TemplatesTable ref={templatesTableRef} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
