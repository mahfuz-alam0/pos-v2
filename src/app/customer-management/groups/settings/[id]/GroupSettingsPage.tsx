"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";

import { getShopRuleByGroup } from "@/services/customerGroups/getShopRule";
import { updateShopRule } from "@/services/customerGroups/updateShopRule";
import { getDefaultMetrcRule } from "@/services/customerGroups/getDefaultMetrcRule";
import { fetchMetrcPurchaseCategoryTypes } from "@/services/categories/metrcDatasets";
import { listUoms } from "@/services/uoms/listUoms";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import GroupSettingsCard from "./GroupSettingsCard";
import type { RuleProfile } from "./types";

const AGE_OPTIONS = Array.from({ length: 30 }, (_, i) => i + 1);

let clientIdCounter = 0;
function nextClientId() {
  clientIdCounter += 1;
  return `profile-${Date.now()}-${clientIdCounter}`;
}

export default function GroupSettingsPage({ groupId }: { groupId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isIdentifier = searchParams.get("isIdentifier") === "true";

  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [minAge, setMinAge] = useState<number | undefined>();
  const [ageVerification, setAgeVerification] = useState(false);
  const [isDefaultChoice, setIsDefaultChoice] = useState(false);
  const [shouldForceValidateMedicalLicenseCheck, setShouldForceValidateMedicalLicenseCheck] = useState(false);
  const [isDefaultChoiceForMJProductsAssociation, setIsDefaultChoiceForMJProductsAssociation] = useState(false);

  const [profiles, setProfiles] = useState<RuleProfile[]>([]);
  const [purchaseTypes, setPurchaseTypes] = useState<{ productCategoryTypeStringId: string; productCategoryType: string }[]>([]);
  const [defaultMetrcRule, setDefaultMetrcRule] = useState<any>(null);
  const [uoms, setUoms] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const load = async () => {
      setPageLoading(true);
      try {
        const [shopRuleRes, purchaseTypesRes, defaultRuleRes, uomsRes] = await Promise.all([
          getShopRuleByGroup(groupId),
          fetchMetrcPurchaseCategoryTypes(),
          getDefaultMetrcRule(),
          listUoms(),
        ]);

        setPurchaseTypes(purchaseTypesRes?.data ?? []);
        setDefaultMetrcRule(defaultRuleRes?.data?.template ?? defaultRuleRes?.data?.tenplate ?? null);
        setUoms(uomsRes?.data?.data?.uoms ?? []);

        const { profiles: fetchedProfiles, additionalRule } = shopRuleRes?.data ?? {};
        const normalized: RuleProfile[] = (fetchedProfiles ?? []).map((p: any) => ({
          clientId: nextClientId(),
          profileType: p.isRelatedToMetrc ? "METRC_BASED" : "CATEGORY_BASED",
          isEnabled: p.isEnabled,
          isRelatedToMetrc: p.isRelatedToMetrc,
          timeFrameToConsider: p.timeFrameToConsider,
          executionOrder: p.executionOrder,
          orderConsiderationStrategy: p.orderConsiderationStrategy,
          maximumPurchaseLimitsBasedOnCategory: (p.maximumPurchaseLimitsBasedOnCategory ?? p.maximumPurchaseLimitsBasedOnMetrc ?? []).map(
            (limit: any) => ({
              ...limit,
              name: limit.name || limit.typeName || limit.typeId || "",
              metrcPurchaseTypeIds: limit.metrcPurchaseTypeIds || [],
            })
          ),
        }));
        setProfiles(normalized);
        setMinAge(additionalRule?.minimumAge);
        setAgeVerification(additionalRule?.shouldForceToValidate || false);
        setIsDefaultChoice(additionalRule?.isDefaultChoice || false);
        setShouldForceValidateMedicalLicenseCheck(additionalRule?.shouldForceValidateMedicalLicenseCheck || false);
        setIsDefaultChoiceForMJProductsAssociation(additionalRule?.isDefaultChoiceForMJProductsAssociation || false);
      } catch (err: any) {
        toast.error(err?.message || "Failed to load group settings");
      } finally {
        setPageLoading(false);
      }
    };
    load();
  }, [groupId]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setProfiles((prev) => {
      const oldIndex = prev.findIndex((p) => p.clientId === active.id);
      const newIndex = prev.findIndex((p) => p.clientId === over.id);
      const reordered = arrayMove(prev, oldIndex, newIndex);
      return reordered.map((p, i) => ({ ...p, executionOrder: i }));
    });
  };

  const addCategoryProfile = () => {
    setProfiles((prev) => [
      ...prev,
      {
        clientId: nextClientId(),
        profileType: "CATEGORY_BASED",
        isEnabled: true,
        isRelatedToMetrc: false,
        timeFrameToConsider: { type: "PER_ORDER", duration: 0 },
        executionOrder: prev.length,
        orderConsiderationStrategy: "WITHIN_SHOP",
        maximumPurchaseLimitsBasedOnCategory: [
          { measurementType: "TOTAL_QUANTITIES", categoryIds: [], name: null, colorCode: "#000000", uomId: "", limit: 0 },
        ],
      },
    ]);
  };

  const addMetrcProfile = () => {
    const template = defaultMetrcRule?.maximumPurchaseLimitsBasedOnCategory ?? [];
    if (!template.length || !purchaseTypes.length) {
      toast.warning("No default METRC rules or purchase types available.");
      return;
    }
    setProfiles((prev) => [
      ...prev,
      {
        clientId: nextClientId(),
        profileType: "METRC_BASED",
        isEnabled: true,
        isRelatedToMetrc: true,
        timeFrameToConsider: { type: "PER_ORDER", duration: 0 },
        executionOrder: prev.length,
        orderConsiderationStrategy: "WITHIN_SHOP",
        maximumPurchaseLimitsBasedOnCategory: template.map((rule: any) => {
          const purchaseTypeName =
            purchaseTypes.find((t) => rule.metrcPurchaseTypeIds?.includes(t.productCategoryTypeStringId))?.productCategoryType || "Unknown";
          return {
            name: rule.name,
            measurementType: rule.measurementType || "TOTAL_QUANTITIES",
            limit: rule.limit || 0,
            uomId: rule.uomId || "",
            colorCode: rule.colorCode || "#000000",
            categoryIds: [],
            purchaseTypeName,
            metrcPurchaseTypeIds: rule.metrcPurchaseTypeIds || [],
          };
        }),
      },
    ]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const shopId = JSON.parse(localStorage.getItem("shopId") || "null");
      const body = {
        shopId,
        groupId,
        additionalRule: {
          minimumAge: minAge,
          shouldForceToValidate: ageVerification,
          isDefaultChoice,
          shouldForceValidateMedicalLicenseCheck,
          isDefaultChoiceForMJProductsAssociation: isDefaultChoiceForMJProductsAssociation || null,
        },
        ruleProfiles: profiles.map((p) => ({
          isEnabled: p.isEnabled,
          timeFrameToConsider: p.timeFrameToConsider,
          executionOrder: p.executionOrder,
          orderConsiderationStrategy: p.orderConsiderationStrategy,
          isRelatedToMetrc: p.profileType === "METRC_BASED",
          maximumPurchaseLimitsBasedOnCategory: p.maximumPurchaseLimitsBasedOnCategory.map((limit) => ({
            measurementType: limit.measurementType,
            categoryIds: limit.categoryIds || [],
            metrcPurchaseTypeIds: p.profileType === "METRC_BASED" ? limit.metrcPurchaseTypeIds || [] : [],
            name: limit.name,
            colorCode: limit.colorCode,
            uomId: limit.uomId,
            limit: limit.limit,
          })),
        })),
      };
      await updateShopRule(body);
      toast.success("Customer group settings updated successfully");
      router.push("/customer-management/groups");
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const sortableIds = useMemo(() => profiles.map((p) => p.clientId), [profiles]);

  return (
    <div className="flex flex-col gap-4 p-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Customer Management</BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/customer-management/groups" />}>Customer Groups</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Settings</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
        {pageLoading ? (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        ) : (
          <>
            <div className="mb-6 border-b pb-4">
              <h2 className="mb-1 text-2xl font-semibold">Purchase Restrictions</h2>
              <p className="text-sm text-muted-foreground">
                Enforcing Per Use Limits and Maximum Purchase Thresholds for Enhanced Control
              </p>
            </div>

            <div className="mb-6">
              <h3 className="mb-4 text-lg font-semibold">Age Verification Controls</h3>
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between border-b py-2">
                  <label className="text-sm font-medium">Minimum Age Requirement</label>
                  <Select
                    value={minAge ? String(minAge) : ""}
                    onValueChange={(val) => setMinAge(Number(val))}
                    items={AGE_OPTIONS.map((a) => ({ value: String(a), label: `${a} years` }))}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="Select Age" />
                    </SelectTrigger>
                    <SelectContent>
                      {AGE_OPTIONS.map((a) => (
                        <SelectItem key={a} value={String(a)}>
                          {a} years
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between border-b py-2">
                  <div>
                    <label className="block text-sm font-medium">Age Confirmation Required Before Purchase</label>
                    <p className="mt-0.5 text-xs text-muted-foreground">Customers must confirm their age before completing purchase</p>
                  </div>
                  <Switch checked={ageVerification} onCheckedChange={setAgeVerification} />
                </div>

                <div className="flex items-center justify-between border-b py-2">
                  <div>
                    <label className="block text-sm font-medium">Set as Default Customer Group</label>
                    <p className="mt-0.5 text-xs text-muted-foreground">Automatically assign new customers to this group</p>
                  </div>
                  <Switch checked={isDefaultChoice} onCheckedChange={setIsDefaultChoice} />
                </div>

                <div className="flex items-center justify-between border-b py-2">
                  <div>
                    <label className="block text-sm font-medium">Default Customer Group for MJ Product Association</label>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      System will automatically assign this customer group for MJ line items
                    </p>
                  </div>
                  <Switch
                    checked={isDefaultChoiceForMJProductsAssociation}
                    onCheckedChange={(val) => setIsDefaultChoiceForMJProductsAssociation(!!val)}
                  />
                </div>

                {isIdentifier && (
                  <div className="flex items-center justify-between border-b py-2">
                    <div>
                      <label className="block text-sm font-medium">Valid Medical License Required</label>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Medical orders can only be completed with valid medical license
                      </p>
                    </div>
                    <Switch checked={shouldForceValidateMedicalLicenseCheck} onCheckedChange={setShouldForceValidateMedicalLicenseCheck} />
                  </div>
                )}
              </div>
            </div>

            <div className="mb-6 border-b pb-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Purchase Limit Profiles</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Create and manage purchase restrictions based on METRC or category rules
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button onClick={addMetrcProfile}>Add METRC Based</Button>
                  <Button variant="outline" onClick={addCategoryProfile}>
                    Add Category Based
                  </Button>
                </div>
              </div>
            </div>

            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                {profiles.map((profile) => (
                  <GroupSettingsCard
                    key={profile.clientId}
                    profile={profile}
                    purchaseTypes={purchaseTypes}
                    uoms={uoms}
                    onMeasurementTypeChange={() => {}}
                    onChange={(next) => setProfiles((prev) => prev.map((p) => (p.clientId === next.clientId ? next : p)))}
                    onRemove={() => setProfiles((prev) => prev.filter((p) => p.clientId !== profile.clientId))}
                  />
                ))}
              </SortableContext>
            </DndContext>

            <div className="mt-6 flex justify-end gap-3 border-t pt-6">
              <Button variant="outline" size="lg" onClick={() => router.push("/customer-management/groups")} disabled={saving}>
                Cancel
              </Button>
              <Button size="lg" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
