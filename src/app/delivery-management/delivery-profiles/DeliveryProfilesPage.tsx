"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchDeliveryProfilesList } from "@/services/deliveryProfiles/list";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableLoadingOverlay, TablePagination } from "@/components/ui/table-pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DeliveryProfileDetailsPanel from "./DeliveryProfileDetailsPanel";
import DeliveryProfileFormDrawer from "./DeliveryProfileFormDrawer";

const ALL_REGIONS = ["CALIFORNIA", "MICHIGAN"];

interface DeliveryProfileRow {
  id: string;
  region: string;
  isEnabled: boolean;
  lastUpdaterName: string;
}

export default function DeliveryProfilesPage() {
  const { shopId } = useShop();

  const [rows, setRows] = useState<DeliveryProfileRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 30, total: 0, totalPages: 1 });

  const [selectedProfile, setSelectedProfile] = useState<any>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [formProfile, setFormProfile] = useState<any>(null);

  const usedRegions = rows.map((r) => r.region).filter(Boolean);
  const availableRegions = ALL_REGIONS.filter((r) => !usedRegions.includes(r));
  const canAddMore = availableRegions.length > 0;

  const loadProfiles = useCallback(
    async (page = 1) => {
      if (!shopId) return;
      setLoading(true);
      try {
        const res = await fetchDeliveryProfilesList(shopId as string, { page, limit: pagination.pageSize });
        const profiles = res?.data ?? [];
        setRows(
          profiles.map((p: any) => ({
            id: p.id,
            region: p.zipCodePreference?.region,
            isEnabled: p.isEnabled,
            lastUpdaterName: p.lastUpdater?.name ?? "-",
          }))
        );
        const pd = res?.paginationData ?? {};
        setPagination((prev) => ({
          current: pd.currentPage ?? page,
          pageSize: pd.limit ?? prev.pageSize,
          total: pd.totalEntries ?? 0,
          totalPages: pd.totalPages ?? 1,
        }));
      } finally {
        setLoading(false);
      }
    },
    [shopId, pagination.pageSize]
  );

  useEffect(() => {
    loadProfiles(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  const openDetails = (row: DeliveryProfileRow) => {
    setSelectedProfile(row);
  };

  return (
    <div className="flex gap-4 p-6">
      <div className={selectedProfile ? "flex w-2/3 flex-col gap-4" : "flex w-full flex-col gap-4"}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Delivery Management</BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Delivery Profiles</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {canAddMore && (
            <Button
              onClick={() => {
                setFormMode("add");
                setFormProfile(null);
                setFormOpen(true);
              }}
            >
              Add Delivery Profile
            </Button>
          )}
        </div>

        <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <TableLoadingOverlay show={loading && rows.length > 0} />
          <Table>
            <TableHeader className="[&_tr]:border-b-0">
              <TableRow className="bg-muted/60">
                <TableHead>Region</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead>Last Updated By</TableHead>
                <TableHead className="text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading &&
                rows.length === 0 &&
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={`sk-${i}`} className="border-b-0">
                    {Array.from({ length: 4 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

              {!loading && rows.length === 0 && (
                <TableRow className="border-b-0">
                  <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                    No delivery profiles found.
                  </TableCell>
                </TableRow>
              )}

              {rows.map((row, i) => (
                <TableRow
                  key={row.id}
                  className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}
                >
                  <TableCell>
                    <button className="text-primary hover:underline" onClick={() => openDetails(row)}>
                      {row.region || "-"}
                    </button>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={row.isEnabled ? "default" : "destructive"}>
                      {row.isEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </TableCell>
                  <TableCell>{row.lastUpdaterName}</TableCell>
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
                        Actions <ChevronDown className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => openDetails(row)}>View Details</DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setFormMode("edit");
                            setFormProfile(row);
                            setFormOpen(true);
                          }}
                        >
                          Edit
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <TablePagination
          page={pagination.current}
          totalPages={pagination.totalPages}
          totalEntries={pagination.total}
          pageSize={pagination.pageSize}
          loading={loading}
          onPageChange={(p: number) => loadProfiles(p)}
        />
      </div>

      {selectedProfile && (
        <div className="w-1/3">
          <DeliveryProfileDetailsPanel profileId={selectedProfile.id} onClose={() => setSelectedProfile(null)} />
        </div>
      )}

      <DeliveryProfileFormDrawer
        open={formOpen}
        mode={formMode}
        profile={formProfile}
        availableRegions={formMode === "edit" ? ALL_REGIONS : availableRegions}
        onClose={() => setFormOpen(false)}
        onSaved={() => loadProfiles(pagination.current)}
      />
    </div>
  );
}
