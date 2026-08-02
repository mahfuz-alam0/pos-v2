"use client";

import { useRouter } from "next/navigation";

import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import EmployeeFormDrawer from "../../EmployeeFormDrawer";

export default function EditEmployeePage({ employeeId }: { employeeId: string }) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-4 p-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Access Management</BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/access-management/employee">Team</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Edit</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <EmployeeFormDrawer
        open
        mode="edit"
        employeeId={employeeId}
        onClose={() => router.push("/access-management/employee")}
        onSaved={() => router.push("/access-management/employee")}
      />
    </div>
  );
}
