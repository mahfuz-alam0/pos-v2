"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { getSingleCustomer } from "@/services/customers/getSingleCustomer";
import { listCustomerGroups } from "@/services/customers/listCustomerGroups";
import { listCustomerTypes } from "@/services/customers/listCustomerTypes";
import { mergeCustomers } from "@/services/customers/mergeCustomers";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const CUSTOMER_COLORS = ["#2563eb", "#16a34a", "#d97706", "#7c3aed"];

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  sex: "MALE",
  phone: "",
  dob: "",
  drivingLicense: "",
  drivingLicenseExpiry: "",
  streetAddress: "",
  city: "",
  state: "",
  zipCode: "",
  customerTypeId: "",
  medicalLicense: "",
  medicalLicenseExpiresAt: "",
  condition: "",
  physician: "",
  careGiverName: "",
  careGiverLicense: "",
  patientName: "",
  patientLicense: "",
  note: "",
};

function SourcePicker({ customers, extractor, onSelect, formatter }: any) {
  const seen = new Set<string>();
  const items = customers
    .map((c: any, idx: number) => {
      const raw = extractor(c);
      const display = formatter ? formatter(raw) : raw;
      return { raw, display, name: `${c.firstName} ${c.lastName}`, color: CUSTOMER_COLORS[idx], idx };
    })
    .filter((item: any) => {
      if (item.raw === null || item.raw === undefined || item.raw === "") return false;
      const key = String(item.raw);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  if (items.length === 0) return null;

  return (
    <div className="mb-1 flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] text-muted-foreground">Pick:</span>
      {items.map((item: any) => (
        <button
          key={item.idx}
          type="button"
          onClick={() => onSelect(item.raw)}
          title={`Use ${item.name}'s value`}
          className="max-w-[180px] truncate rounded-full border px-2 py-0.5 text-[11px]"
          style={{ borderColor: item.color, color: item.color }}
        >
          <b>{item.name.split(" ")[0]}:</b>{" "}
          {String(item.display || "").length > 20 ? String(item.display).slice(0, 20) + "…" : String(item.display || "") || "N/A"}
        </button>
      ))}
    </div>
  );
}

interface MergeCustomersDrawerProps {
  open: boolean;
  onClose: () => void;
  selectedCustomerIds: string[];
  onSuccess: () => void;
}

export default function MergeCustomersDrawer({ open, onClose, selectedCustomerIds, onSuccess }: MergeCustomersDrawerProps) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [merging, setMerging] = useState(false);
  const [mergedCustomer, setMergedCustomer] = useState<any>(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [customerGroupIds, setCustomerGroupIds] = useState<string[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [customerTypes, setCustomerTypes] = useState<any[]>([]);
  const [accountActive, setAccountActive] = useState(true);
  const [temporaryPatient, setTemporaryPatient] = useState(false);
  const [hasCaregiver, setHasCaregiver] = useState(false);
  const [isCaregiver, setIsCaregiver] = useState(false);

  useEffect(() => {
    if (!open || selectedCustomerIds.length < 2) return;
    setLoading(true);
    Promise.all([
      Promise.all(selectedCustomerIds.map((id) => getSingleCustomer(id).then((r) => r?.data?.data?.customer))),
      listCustomerGroups(),
      listCustomerTypes(),
    ])
      .then(([customerResults, groupsRes, typesRes]) => {
        const list = customerResults.filter(Boolean);
        setCustomers(list);
        setGroups(groupsRes?.data?.data?.customerGroups || []);
        setCustomerTypes(typesRes?.data?.data?.customerTypes || []);

        const first = list[0];
        if (first) {
          setForm({
            firstName: first.firstName || "",
            lastName: first.lastName || "",
            email: first.email || "",
            sex: first.sex || "MALE",
            phone: (first.phone || "").replace(/^\+/, ""),
            dob: first.dob ? first.dob.slice(0, 10) : "",
            drivingLicense: first.drivingLicense || "",
            drivingLicenseExpiry: first.drivingLicenseExpiry ? first.drivingLicenseExpiry.slice(0, 10) : "",
            streetAddress: first.locationDetails?.streetAddress || "",
            city: first.locationDetails?.city || "",
            state: first.locationDetails?.state || "",
            zipCode: first.locationDetails?.zipCode || "",
            customerTypeId: first.customerTypeId || "",
            medicalLicense: first.mjMedicalData?.medicalLicense || "",
            medicalLicenseExpiresAt: first.mjMedicalData?.medicalLicenseExpiresAt
              ? first.mjMedicalData.medicalLicenseExpiresAt.slice(0, 10)
              : "",
            condition: first.mjMedicalData?.condition || "",
            physician: first.mjMedicalData?.physician || "",
            careGiverName: first.mjMedicalData?.careGiverName || "",
            careGiverLicense: first.mjMedicalData?.careGiverLicense || "",
            patientName: first.mjMedicalData?.patientName || "",
            patientLicense: first.mjMedicalData?.patientLicense || "",
            note: first.note || "",
          });
          const allGroupIds = [...new Set(list.flatMap((c: any) => c.customerGroups?.map((g: any) => g.id) || []))] as string[];
          setCustomerGroupIds(allGroupIds);
          setAccountActive(!first.isLocked);
          setTemporaryPatient(!!first.mjMedicalData?.isTemporaryPatient);
          setHasCaregiver(!!first.mjMedicalData?.hasCareGiver);
          setIsCaregiver(!!first.mjMedicalData?.isCareGiver);
        }
      })
      .catch(() => toast.error("Failed to load customer details"))
      .finally(() => setLoading(false));
  }, [open, selectedCustomerIds]);

  const setField = (field: string) => (e: any) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const pick = (field: string) => (value: any) => setForm((f) => ({ ...f, [field]: value ?? "" }));

  const toggleGroup = (groupId: string) => {
    setCustomerGroupIds((prev) => (prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]));
  };

  const isMedical = groups.filter((g) => customerGroupIds.includes(g.id)).some((g) => g.systemGeneratedIdentifier === "MJ_MEDICAL");

  const handleClose = () => {
    setCustomers([]);
    setForm(EMPTY_FORM);
    setCustomerGroupIds([]);
    onClose();
  };

  const handleMerge = async () => {
    if (!form.firstName.trim()) {
      toast.error("Please input first name!");
      return;
    }
    if (!form.dob) {
      toast.error("Please select a Date of Birth");
      return;
    }
    if (isMedical && (!form.medicalLicense.trim() || !form.medicalLicenseExpiresAt)) {
      toast.error("Medical license number and expiry are required for medical customers");
      return;
    }

    setMerging(true);
    const shopId = JSON.parse(localStorage.getItem("shopId") || "null");
    const formattedPhone = form.phone ? `+${form.phone.replace(/^\+/, "")}` : null;

    const payload = {
      customerIdsToMerge: selectedCustomerIds.map((id) => String(id)),
      newProperties: {
        email: form.email || null,
        firstName: form.firstName,
        lastName: form.lastName || null,
        countryCode: "US",
        ...(formattedPhone && { phone: formattedPhone }),
        locationDetails: {
          country: "US",
          city: form.city || null,
          state: form.state || null,
          streetAddress: form.streetAddress || null,
          zipCode: form.zipCode || null,
        },
        mjMedicalData: {
          isTemporaryPatient: temporaryPatient,
          condition: form.condition || null,
          physician: form.physician || null,
          hasCareGiver: hasCaregiver,
          isCareGiver: isCaregiver,
          careGiverName: form.careGiverName || null,
          patientName: form.patientName || null,
          patientLicense: form.patientLicense || null,
          medicalLicense: form.medicalLicense || null,
          careGiverLicense: form.careGiverLicense || null,
          medicalLicenseExpiresAt: form.medicalLicenseExpiresAt || "2001-01-01",
        },
        customerGroupIds,
        note: form.note || null,
        dob: form.dob,
        drivingLicense: form.drivingLicense || null,
        customerTypeId: form.customerTypeId || null,
        isLocked: !accountActive,
        shopId,
        sex: form.sex || "MALE",
        drivingLicenseExpiry: form.drivingLicenseExpiry || null,
      },
    };

    try {
      const res = await mergeCustomers(payload);
      if (res?.data?.success) {
        setMergedCustomer(res.data.data?.mergedCustomerRawData || res.data.data);
        handleClose();
      } else {
        toast.error(res?.data?.data?.message || res?.data?.message || "Failed to merge customers");
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to merge customers");
    } finally {
      setMerging(false);
    }
  };

  return (
    <>
      <Drawer open={open} onClose={handleClose} side="right" size="70vw">
        <div className="flex h-full flex-col">
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-6 py-4">
            <span className="text-base font-semibold">Merge Customers</span>
            {customers.map((c, idx) => (
              <Badge key={c.id} style={{ backgroundColor: CUSTOMER_COLORS[idx], color: "#fff" }}>
                {c.firstName} {c.lastName}
              </Badge>
            ))}
          </div>

          {loading ? (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">Loading customer details…</div>
          ) : customers.length < 2 ? (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              Please select at least 2 customers to merge.
            </div>
          ) : (
            <>
              <div className="flex-1 space-y-5 overflow-auto p-4">
                <section className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Basic Info</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <SourcePicker customers={customers} extractor={(c: any) => c.firstName} onSelect={pick("firstName")} />
                      <Label htmlFor="m-firstName">First Name *</Label>
                      <Input id="m-firstName" className="mt-1" value={form.firstName} onChange={setField("firstName")} />
                    </div>
                    <div>
                      <SourcePicker customers={customers} extractor={(c: any) => c.lastName} onSelect={pick("lastName")} />
                      <Label htmlFor="m-lastName">Last Name</Label>
                      <Input id="m-lastName" className="mt-1" value={form.lastName} onChange={setField("lastName")} />
                    </div>
                    <div>
                      <SourcePicker customers={customers} extractor={(c: any) => c.email} onSelect={pick("email")} />
                      <Label htmlFor="m-email">Email</Label>
                      <Input id="m-email" className="mt-1" value={form.email} onChange={setField("email")} />
                    </div>
                    <div>
                      <SourcePicker customers={customers} extractor={(c: any) => c.sex} onSelect={pick("sex")} />
                      <Label>Sex</Label>
                      <Select value={form.sex} onValueChange={(v) => setForm((f) => ({ ...f, sex: v }))}>
                        <SelectTrigger className="mt-1 w-full">
                          <SelectValue placeholder="Select sex" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MALE">Male</SelectItem>
                          <SelectItem value="FEMALE">Female</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <SourcePicker customers={customers} extractor={(c: any) => c.phone} onSelect={pick("phone")} />
                      <Label htmlFor="m-phone">Phone Number</Label>
                      <Input id="m-phone" type="tel" className="mt-1" value={form.phone} onChange={setField("phone")} />
                    </div>
                    <div>
                      <SourcePicker
                        customers={customers}
                        extractor={(c: any) => c.dob}
                        formatter={(v: string) => (v ? new Date(v).toLocaleDateString() : null)}
                        onSelect={pick("dob")}
                      />
                      <Label htmlFor="m-dob">Date of Birth *</Label>
                      <Input id="m-dob" type="date" className="mt-1" value={form.dob} onChange={setField("dob")} />
                    </div>
                    <div>
                      <SourcePicker customers={customers} extractor={(c: any) => c.drivingLicense} onSelect={pick("drivingLicense")} />
                      <Label htmlFor="m-dl">Driver's License</Label>
                      <Input id="m-dl" className="mt-1" value={form.drivingLicense} onChange={setField("drivingLicense")} />
                    </div>
                    <div>
                      <SourcePicker
                        customers={customers}
                        extractor={(c: any) => c.drivingLicenseExpiry}
                        formatter={(v: string) => (v ? new Date(v).toLocaleDateString() : null)}
                        onSelect={pick("drivingLicenseExpiry")}
                      />
                      <Label htmlFor="m-dlExpiry">License Expiration</Label>
                      <Input id="m-dlExpiry" type="date" className="mt-1" value={form.drivingLicenseExpiry} onChange={setField("drivingLicenseExpiry")} />
                    </div>
                  </div>
                </section>

                <section className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Address</h4>
                  <div>
                    <SourcePicker customers={customers} extractor={(c: any) => c.locationDetails?.streetAddress} onSelect={pick("streetAddress")} />
                    <Label htmlFor="m-street">Street Address</Label>
                    <Input id="m-street" className="mt-1" value={form.streetAddress} onChange={setField("streetAddress")} />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <SourcePicker customers={customers} extractor={(c: any) => c.locationDetails?.city} onSelect={pick("city")} />
                      <Label htmlFor="m-city">City</Label>
                      <Input id="m-city" className="mt-1" value={form.city} onChange={setField("city")} />
                    </div>
                    <div>
                      <SourcePicker customers={customers} extractor={(c: any) => c.locationDetails?.state} onSelect={pick("state")} />
                      <Label htmlFor="m-state">State</Label>
                      <Input id="m-state" className="mt-1" value={form.state} onChange={setField("state")} />
                    </div>
                    <div>
                      <SourcePicker customers={customers} extractor={(c: any) => c.locationDetails?.zipCode} onSelect={pick("zipCode")} />
                      <Label htmlFor="m-zip">Zip Code</Label>
                      <Input id="m-zip" className="mt-1" value={form.zipCode} onChange={setField("zipCode")} />
                    </div>
                  </div>
                </section>

                <section className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">General Details</h4>
                  <div>
                    <Label>Customer Groups *</Label>
                    <div className="mt-1 max-h-32 space-y-1 overflow-auto rounded-lg border border-border p-2">
                      {groups.map((g) => (
                        <label key={g.id} className="flex items-center gap-2 text-sm">
                          <Checkbox checked={customerGroupIds.includes(g.id)} onCheckedChange={() => toggleGroup(g.id)} />
                          {g.name}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <SourcePicker
                      customers={customers}
                      extractor={(c: any) => c.customerTypeId}
                      formatter={(v: string) => customerTypes.find((t) => t.id === v)?.name ?? v}
                      onSelect={pick("customerTypeId")}
                    />
                    <Label>Customer Type</Label>
                    <Select value={form.customerTypeId} onValueChange={(v) => setForm((f) => ({ ...f, customerTypeId: v }))}>
                      <SelectTrigger className="mt-1 w-full">
                        <SelectValue placeholder="Select customer type" />
                      </SelectTrigger>
                      <SelectContent>
                        {customerTypes.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </section>

                {isMedical && (
                  <section className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-destructive">Medical Info</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <SourcePicker customers={customers} extractor={(c: any) => c.mjMedicalData?.medicalLicense} onSelect={pick("medicalLicense")} />
                        <Label htmlFor="m-medLicense">Med License Number *</Label>
                        <Input id="m-medLicense" className="mt-1" value={form.medicalLicense} onChange={setField("medicalLicense")} />
                      </div>
                      <div>
                        <SourcePicker
                          customers={customers}
                          extractor={(c: any) => c.mjMedicalData?.medicalLicenseExpiresAt}
                          formatter={(v: string) => (v ? new Date(v).toLocaleDateString() : null)}
                          onSelect={pick("medicalLicenseExpiresAt")}
                        />
                        <Label htmlFor="m-medExpiry">Med License Expires *</Label>
                        <Input id="m-medExpiry" type="date" className="mt-1" value={form.medicalLicenseExpiresAt} onChange={setField("medicalLicenseExpiresAt")} />
                      </div>
                      <div>
                        <SourcePicker customers={customers} extractor={(c: any) => c.mjMedicalData?.condition} onSelect={pick("condition")} />
                        <Label htmlFor="m-condition">Condition</Label>
                        <Input id="m-condition" className="mt-1" value={form.condition} onChange={setField("condition")} />
                      </div>
                      <div>
                        <SourcePicker customers={customers} extractor={(c: any) => c.mjMedicalData?.physician} onSelect={pick("physician")} />
                        <Label htmlFor="m-physician">Physician</Label>
                        <Input id="m-physician" className="mt-1" value={form.physician} onChange={setField("physician")} />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 rounded-lg bg-muted p-3">
                      <label className="flex items-center justify-between gap-2 text-sm">
                        Temporary Patient
                        <Checkbox checked={temporaryPatient} onCheckedChange={(c) => setTemporaryPatient(!!c)} />
                      </label>
                      <label className="flex items-center justify-between gap-2 text-sm">
                        Has Caregiver
                        <Checkbox
                          checked={hasCaregiver}
                          onCheckedChange={(c) => {
                            setHasCaregiver(!!c);
                            if (c) setIsCaregiver(false);
                          }}
                        />
                      </label>
                      <label className="flex items-center justify-between gap-2 text-sm">
                        Is Caregiver
                        <Checkbox
                          checked={isCaregiver}
                          onCheckedChange={(c) => {
                            setIsCaregiver(!!c);
                            if (c) setHasCaregiver(false);
                          }}
                        />
                      </label>
                    </div>

                    {hasCaregiver && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <SourcePicker customers={customers} extractor={(c: any) => c.mjMedicalData?.careGiverName} onSelect={pick("careGiverName")} />
                          <Label htmlFor="m-cgName">Caregiver Name</Label>
                          <Input id="m-cgName" className="mt-1" value={form.careGiverName} onChange={setField("careGiverName")} />
                        </div>
                        <div>
                          <SourcePicker customers={customers} extractor={(c: any) => c.mjMedicalData?.careGiverLicense} onSelect={pick("careGiverLicense")} />
                          <Label htmlFor="m-cgLicense">Caregiver License</Label>
                          <Input id="m-cgLicense" className="mt-1" value={form.careGiverLicense} onChange={setField("careGiverLicense")} />
                        </div>
                      </div>
                    )}

                    {isCaregiver && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <SourcePicker customers={customers} extractor={(c: any) => c.mjMedicalData?.patientName} onSelect={pick("patientName")} />
                          <Label htmlFor="m-patName">Patient Name</Label>
                          <Input id="m-patName" className="mt-1" value={form.patientName} onChange={setField("patientName")} />
                        </div>
                        <div>
                          <SourcePicker customers={customers} extractor={(c: any) => c.mjMedicalData?.patientLicense} onSelect={pick("patientLicense")} />
                          <Label htmlFor="m-patLicense">Patient License</Label>
                          <Input id="m-patLicense" className="mt-1" value={form.patientLicense} onChange={setField("patientLicense")} />
                        </div>
                      </div>
                    )}
                  </section>
                )}

                <section className="space-y-3">
                  <div>
                    <SourcePicker customers={customers} extractor={(c: any) => c.note} onSelect={pick("note")} />
                    <Label htmlFor="m-note">Notes</Label>
                    <Textarea id="m-note" className="mt-1" rows={3} value={form.note} onChange={setField("note")} />
                  </div>
                  <label className="flex items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm">
                    <div>
                      <div className="font-semibold">{accountActive ? "Account Active" : "Account Disabled"}</div>
                    </div>
                    <Checkbox checked={accountActive} onCheckedChange={(c) => setAccountActive(!!c)} />
                  </label>
                </section>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="button" disabled={merging} onClick={handleMerge}>
                  {merging ? "Merging…" : "Merge Customers"}
                </Button>
              </div>
            </>
          )}
        </div>
      </Drawer>

      <Dialog open={!!mergedCustomer} onOpenChange={(next) => !next && (setMergedCustomer(null), onSuccess())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-green-600">✓ Customers Merged Successfully</DialogTitle>
          </DialogHeader>
          {mergedCustomer && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground">Full Name</span>
                <span className="font-medium">
                  {[mergedCustomer.firstName, mergedCustomer.lastName].filter(Boolean).join(" ") || "—"}
                </span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium">{mergedCustomer.email || "—"}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground">Phone</span>
                <span className="font-medium">{mergedCustomer.phone || "—"}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground">Driver&apos;s License</span>
                <span className="font-medium">{mergedCustomer.drivingLicense || "—"}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={() => {
                setMergedCustomer(null);
                onSuccess();
              }}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
