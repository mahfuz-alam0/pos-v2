"use client";

import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import {
  User,
  MapPin,
  Users,
  Stethoscope,
  MessageSquare,
  ShieldAlert,
  X,
} from "lucide-react";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import EnterPin from "@/components/pos/EnterPin";

import { createCustomer } from "@/services/customers/createCustomer";
import { updateCustomerInfo } from "@/services/customers/updateCustomer";
import { deleteCustomer } from "@/services/customers/deleteCustomer";
import { listCustomerGroups } from "@/services/customers/listCustomerGroups";
import { listCustomerTypes } from "@/services/customers/listCustomerTypes";
import { findDuplicateCustomers } from "@/services/customers/findDuplicateCustomers";
import { getSingleCustomer } from "@/services/customers/getSingleCustomer";
import { getShopPreference } from "@/services/sales/getShopPreference";
import { verifyOmmaLicense } from "@/services/metrc/verifyOmmaLicense";

const REFERRAL_SOURCE_OPTIONS = [
  "YouTube",
  "Facebook",
  "Instagram",
  "Weedmaps",
  "Leafly",
  "Google",
  "Word of Mouth",
  "Other",
];

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  sex: "",
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
  referralSource: "",
  note: "",
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const eighteenYearsAgoISO = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d.toISOString().slice(0, 10);
};

/**
 * Full customer-creation form, ported field-for-field and check-for-check
 * from the legacy Add Customer page (routes/Admin/Customer Management/Add
 * Customer/index.js) — identity, address, customer groups/type, MJ-medical
 * section, referral source, notes, account-status + cashier-warning toggles,
 * the pre-create duplicate-license check with override/delete, the OMMA
 * medical-license verification check, and the share-mode PIN gate.
 *
 * Not ported (flagged, not silently dropped) — these depend on subsystems
 * that don't exist in this app yet:
 *  - OCR / camera driving-license scan and the barcode DL scanner
 *  - Avatar photo + document upload (no uploadFile/uploadFiles pipeline here)
 *  - Country picker (no country-list service here) — countryCode is fixed to
 *    "US"
 *  - ZIP → city/state autofill (legacy called Google Geocoding directly from
 *    the browser with a hardcoded API key; that's not something to carry
 *    forward as-is). City/state/zip remain plain editable fields, so no data
 *    the old form captured is missing — just the autofill convenience.
 */
export default function AddCustomerForm({
  open,
  onClose,
  onCreated,
  // Two ways to edit an existing customer: pass the object directly
  // (customer — no extra fetch), or just its id (customerId — this form
  // fetches it itself). Both resolve to the same editSource/editTargetId
  // below, so the rest of the component doesn't need to care which was used.
  customer = null,
  customerId = null,
  onUpdated = undefined,
  // Prefills a NEW customer's fields (e.g. from a DL/med-ID scan) — ignored
  // once editing, since the edit-prefill effect below takes over.
  initialValues = undefined,
  zIndex = 60,
}) {
  const quoteBody = useSelector((state: any) => state?.salesDetail);

  const [form, setForm] = useState(EMPTY_FORM);
  const [fetchedCustomer, setFetchedCustomer] = useState(null);
  const [customerGroupIds, setCustomerGroupIds] = useState([]);
  const [groups, setGroups] = useState([]);
  const [customerTypes, setCustomerTypes] = useState([]);
  const [requireGroupForMJ, setRequireGroupForMJ] = useState(false);
  const [loadingCustomer, setLoadingCustomer] = useState(false);

  const editTargetId = customerId || customer?.id || null;
  const editSource = customer || fetchedCustomer;
  const isEditMode = !!editTargetId;

  // Fetch by id when only customerId was given (customer object skips this).
  useEffect(() => {
    if (!open || !customerId || customer) {
      setFetchedCustomer(null);
      return;
    }
    setLoadingCustomer(true);
    getSingleCustomer(customerId)
      .then((res) => setFetchedCustomer(res?.data?.data?.customer || null))
      .catch(() => setFetchedCustomer(null))
      .finally(() => setLoadingCustomer(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, customerId, customer]);

  useEffect(() => {
    if (open && !isEditMode) {
      reset(initialValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const [accountActive, setAccountActive] = useState(true);
  const [shouldWarnUser, setShouldWarnUser] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");
  const [temporaryPatient, setTemporaryPatient] = useState(false);
  const [hasCaregiver, setHasCaregiver] = useState(false);
  const [isCaregiver, setIsCaregiver] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [saveMode, setSaveMode] = useState(null); // 'save' | 'queue' | 'order'
  const [foundCustomers, setFoundCustomers] = useState([]);
  const [overridingId, setOverridingId] = useState(null);

  const [pinOpen, setPinOpen] = useState(false);
  const pendingSubmitRef = useRef(null);

  const isMjMedical = groups
    .filter((g) => customerGroupIds.includes(g.id))
    .some((g) => g.systemGeneratedIdentifier === "MJ_MEDICAL");

  useEffect(() => {
    if (!open) return;
    listCustomerGroups()
      .then((res) => {
        const list = res?.data?.data?.customerGroups || [];
        setGroups(list);
        // Only pre-select the shop's default group when creating — editing
        // prefills from the customer's actual groups instead (see below).
        if (!isEditMode) {
          const defaultGroup = list.find((g) => g.isDefaultForShop);
          if (defaultGroup) setCustomerGroupIds([defaultGroup.id]);
        }
      })
      .catch(() => {});
    listCustomerTypes()
      .then((res) => setCustomerTypes(res?.data?.data?.customerTypes || []))
      .catch(() => {});
    getShopPreference()
      .then((res) =>
        setRequireGroupForMJ(
          !!res?.data?.preference
            ?.isChoosingCustomerGroupMandatoryForMJProducts,
        ),
      )
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Prefill from the existing customer when editing — editSource is either
  // the object passed in directly, or the one this form just fetched by id.
  useEffect(() => {
    if (!open || !editSource) return;
    setForm({
      firstName: editSource.firstName || "",
      lastName: editSource.lastName || "",
      email: editSource.email || "",
      phone: (editSource.phone || "").replace(/^\+/, ""),
      sex: editSource.sex || "",
      dob: editSource.dob || "",
      drivingLicense: editSource.drivingLicense || "",
      drivingLicenseExpiry: editSource.drivingLicenseExpiry || "",
      streetAddress: editSource.locationDetails?.streetAddress || "",
      city: editSource.locationDetails?.city || "",
      state: editSource.locationDetails?.state || "",
      zipCode: editSource.locationDetails?.zipCode || "",
      customerTypeId: editSource.customerTypeId || "",
      medicalLicense: editSource.mjMedicalData?.medicalLicense || "",
      medicalLicenseExpiresAt:
        editSource.mjMedicalData?.medicalLicenseExpiresAt || "",
      condition: editSource.mjMedicalData?.condition || "",
      physician: editSource.mjMedicalData?.physician || "",
      careGiverName: editSource.mjMedicalData?.careGiverName || "",
      careGiverLicense: editSource.mjMedicalData?.careGiverLicense || "",
      patientName: editSource.mjMedicalData?.patientName || "",
      patientLicense: editSource.mjMedicalData?.patientLicense || "",
      referralSource: editSource.referralSource || "",
      note: editSource.note || "",
    });
    setCustomerGroupIds(
      (editSource.customerGroups || [])
        .map((g) => (typeof g === "string" ? g : g?.id))
        .filter(Boolean),
    );
    setAccountActive(!editSource.isLocked);
    setShouldWarnUser(!!editSource.shouldWarnUser);
    setWarningMessage(editSource.warningMessage || "");
    setTemporaryPatient(!!editSource.mjMedicalData?.isTemporaryPatient);
    setHasCaregiver(!!editSource.mjMedicalData?.hasCareGiver);
    setIsCaregiver(!!editSource.mjMedicalData?.isCareGiver);
  }, [open, editSource]);

  const setField = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const reset = (nextInitialValues: Record<string, string> = {}) => {
    setForm({ ...EMPTY_FORM, ...nextInitialValues });
    setCustomerGroupIds([]);
    setAccountActive(true);
    setShouldWarnUser(false);
    setWarningMessage("");
    setTemporaryPatient(false);
    setHasCaregiver(false);
    setIsCaregiver(false);
    setSaveMode(null);
    setFoundCustomers([]);
  };

  const toggleGroup = (groupId) => {
    setCustomerGroupIds((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId],
    );
  };

  const validate = () => {
    if (!form.firstName.trim()) {
      toast.error("Please input first name!");
      return false;
    }
    if (!form.customerTypeId) {
      toast.error("Please select customer type or None");
      return false;
    }
    if (requireGroupForMJ && customerGroupIds.length === 0) {
      toast.error("A customer group is required for MJ product purchases");
      return false;
    }
    if (isMjMedical && !form.medicalLicense.trim()) {
      toast.error("Please input medical license number!");
      return false;
    }
    if (form.dob) {
      if (form.dob > todayISO()) {
        toast.error("Date of Birth cannot be in the future");
        return false;
      }
      if (form.dob > eighteenYearsAgoISO()) {
        toast.error("Customer must be at least 18 years old");
        return false;
      }
    }
    if (form.drivingLicenseExpiry && form.drivingLicenseExpiry < todayISO()) {
      toast.error("License expiration date cannot be in the past");
      return false;
    }
    if (
      form.medicalLicenseExpiresAt &&
      form.medicalLicenseExpiresAt < todayISO()
    ) {
      toast.error("Medical license expiration date cannot be in the past");
      return false;
    }
    return true;
  };

  const buildPayload = () => {
    const shopId = JSON.parse(localStorage.getItem("shopId"));
    return {
      email: form.email || undefined,
      firstName: form.firstName,
      lastName: form.lastName || undefined,
      countryCode: "US",
      sex: form.sex || undefined,
      phone: form.phone ? `+${form.phone.replace(/^\+/, "")}` : undefined,
      locationDetails: {
        country: "US",
        city: form.city || undefined,
        state: form.state || undefined,
        streetAddress: form.streetAddress || undefined,
        zipCode: form.zipCode || undefined,
      },
      mjMedicalData: isMjMedical
        ? {
            medicalLicense: form.medicalLicense,
            medicalLicenseExpiresAt: form.medicalLicenseExpiresAt || undefined,
            isTemporaryPatient: temporaryPatient,
            condition: form.condition || undefined,
            physician: form.physician || undefined,
            hasCareGiver: hasCaregiver,
            isCareGiver: isCaregiver,
            careGiverName: hasCaregiver ? form.careGiverName : undefined,
            careGiverLicense: hasCaregiver ? form.careGiverLicense : undefined,
            patientName: isCaregiver ? form.patientName : undefined,
            patientLicense: isCaregiver ? form.patientLicense : undefined,
          }
        : undefined,
      customerGroupIds,
      note: form.note || undefined,
      dob: form.dob || undefined,
      drivingLicense: form.drivingLicense || undefined,
      drivingLicenseExpiry: form.drivingLicenseExpiry || undefined,
      customerTypeId: form.customerTypeId !== "none" ? form.customerTypeId : "",
      isLocked: !accountActive,
      shouldWarnUser,
      warningMessage: shouldWarnUser ? warningMessage : null,
      shopId,
      referralSource: form.referralSource || null,
    };
  };

  const runCreate = async (mode, proxyPin) => {
    setSubmitting(true);
    try {
      const res = await createCustomer({
        ...buildPayload(),
        shouldAddToTheQueue: mode === "queue",
        proxyPin,
      });
      const customer = res?.data?.data?.customer || res?.data?.data;
      toast.success("Customer created successfully");
      reset();
      onCreated?.(customer, mode);
      onClose?.();
    } catch (error) {
      if (error?.message === "No user found for the pin") {
        toast.error("Invalid PIN");
        setPinOpen(true);
        return;
      }
      const msg =
        error?.errors?.join(", ") ||
        error?.message ||
        "Failed to create customer";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const runUpdate = async (proxyPin) => {
    setSubmitting(true);
    try {
      await updateCustomerInfo(editTargetId, { ...buildPayload(), proxyPin });
      toast.success("Customer updated successfully");
      onUpdated?.({ ...editSource, ...buildPayload() });
      onClose?.();
    } catch (error) {
      if (error?.message === "No user found for the pin") {
        toast.error("Invalid PIN");
        setPinOpen(true);
        return;
      }
      const msg =
        error?.errors?.join(", ") ||
        error?.message ||
        "Failed to update customer";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const shareModeActive =
    typeof window !== "undefined" &&
    localStorage.getItem("shareMode") === "true";

  const handleSubmit = async (mode) => {
    if (!validate()) return;
    setSaveMode(mode);

    // Editing skips the duplicate-license lookup (that's a create-time
    // safeguard) and the queue/order save modes — just save the changes.
    if (isEditMode) {
      if (shareModeActive && quoteBody?.proxyPin == null) {
        pendingSubmitRef.current = () => runUpdate(quoteBody?.proxyPin);
        setPinOpen(true);
        return;
      }
      runUpdate(quoteBody?.proxyPin);
      return;
    }

    // Duplicate-license check, matching the legacy pre-create lookup.
    if (form.drivingLicense || form.medicalLicense) {
      setSubmitting(true);
      try {
        const res = await findDuplicateCustomers({
          drivingLicense: form.drivingLicense,
          medicalLicense: form.medicalLicense,
        });
        const found = res?.data?.data?.foundCustomers || [];
        if (found.length > 0) {
          setFoundCustomers(found);
          setSubmitting(false);
          return;
        }
      } catch {
        // lookup failing shouldn't block customer creation
      }
      setSubmitting(false);
    }

    if (shareModeActive && quoteBody?.proxyPin == null) {
      pendingSubmitRef.current = () => runCreate(mode, quoteBody?.proxyPin);
      setPinOpen(true);
      return;
    }

    runCreate(mode, quoteBody?.proxyPin);
  };

  const handleVerifyMedicalLicense = async () => {
    if (!form.medicalLicense.trim()) return;
    try {
      const res = await verifyOmmaLicense(form.medicalLicense);
      const { isValid, warningMessage: warnMsg } = res?.data?.data || {};
      if (!isValid) {
        toast.error(warnMsg || "License is not valid");
      } else if (warnMsg) {
        toast.success(warnMsg);
      } else {
        toast.success("License verified successfully");
      }
    } catch {
      // advisory check only — never blocks the form
    }
  };

  const handleOverride = async (customerId) => {
    setOverridingId(customerId);
    try {
      await updateCustomerInfo(customerId, buildPayload());
      toast.success("Customer created successfully");
      setFoundCustomers((prev) =>
        prev.filter((c) => c.customer.id !== customerId),
      );
      reset();
      onCreated?.({ id: customerId, ...buildPayload() }, saveMode);
      onClose?.();
    } catch (error) {
      toast.error(error?.message || "Error during override");
    } finally {
      setOverridingId(null);
    }
  };

  const handleDeleteFound = async (customerId) => {
    setOverridingId(customerId);
    try {
      await deleteCustomer(customerId);
      toast.success("Customer deleted successfully");
      setFoundCustomers((prev) =>
        prev.filter((c) => c.customer.id !== customerId),
      );
    } catch (error) {
      toast.error(error?.message || "Failed to delete customer");
    } finally {
      setOverridingId(null);
    }
  };

  return (
    <>
      <Drawer
        open={open}
        onClose={() => {
          reset();
          onClose?.();
        }}
        side="right"
        size={760}
        zIndex={zIndex}>
        <div className="flex h-full flex-col">
          <div className="border-b border-border px-6 py-4 text-base font-semibold">
            {isEditMode ? "Edit Customer" : "Add Customer"}
          </div>

          {loadingCustomer ? (
            <div className="flex-1 p-6 text-sm text-muted-foreground">
              Loading customer…
            </div>
          ) : foundCustomers.length > 0 ? (
            <div className="flex-1 space-y-3 overflow-auto p-6">
              <p className="text-sm text-muted-foreground">
                We found {foundCustomers.length} existing customer
                {foundCustomers.length > 1 ? "s" : ""} with a matching
                driving/medical license. Override an existing record, delete it,
                or go back and change the license number.
              </p>
              {foundCustomers.map((data) => (
                <div
                  key={data.customer.id}
                  className="rounded-xl bg-muted/40 p-3 ring-1 ring-foreground/10">
                  <div className="font-semibold">
                    {data.customer.firstName} {data.customer.lastName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {data.customer.email || data.customer.phone || "—"}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      disabled={overridingId === data.customer.id}
                      onClick={() => handleOverride(data.customer.id)}>
                      Override
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={overridingId === data.customer.id}
                      onClick={() => handleDeleteFound(data.customer.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={() => setFoundCustomers([])}>
                Back to form
              </Button>
            </div>
          ) : (
            <form
              onSubmit={(e) => e.preventDefault()}
              className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 space-y-6 overflow-auto p-6">
                {/* Basic information */}
                <section className="space-y-3 rounded-xl bg-muted/30 p-4 ring-1 ring-foreground/10">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <User className="h-4 w-4 text-muted-foreground" />
                    Basic Information
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        className="mt-1"
                        value={form.firstName}
                        onChange={setField("firstName")}
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        className="mt-1"
                        value={form.lastName}
                        onChange={setField("lastName")}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      className="mt-1"
                      value={form.email}
                      onChange={setField("email")}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Gender</Label>
                      <Select
                        items={[
                          { value: "MALE", label: "Male" },
                          { value: "FEMALE", label: "Female" },
                          { value: "OTHER", label: "Other" },
                        ]}
                        value={form.sex}
                        onValueChange={(value) =>
                          setForm((f) => ({ ...f, sex: value }))
                        }>
                        <SelectTrigger className="mt-1 w-full">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MALE">Male</SelectItem>
                          <SelectItem value="FEMALE">Female</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="dob">Date of Birth</Label>
                      <Input
                        id="dob"
                        type="date"
                        className="mt-1"
                        max={eighteenYearsAgoISO()}
                        value={form.dob}
                        onChange={setField("dob")}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      className="mt-1"
                      placeholder="15551234567"
                      value={form.phone}
                      onChange={setField("phone")}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="drivingLicense">
                        Driver&apos;s License
                      </Label>
                      <Input
                        id="drivingLicense"
                        className="mt-1"
                        value={form.drivingLicense}
                        onChange={setField("drivingLicense")}
                      />
                    </div>
                    <div>
                      <Label htmlFor="drivingLicenseExpiry">
                        License Expiration
                      </Label>
                      <Input
                        id="drivingLicenseExpiry"
                        type="date"
                        className="mt-1"
                        min={todayISO()}
                        value={form.drivingLicenseExpiry}
                        onChange={setField("drivingLicenseExpiry")}
                      />
                    </div>
                  </div>
                </section>

                {/* Address */}
                <section className="space-y-3 rounded-xl bg-muted/30 p-4 ring-1 ring-foreground/10">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    Address Information
                  </h4>
                  <div>
                    <Label htmlFor="streetAddress">Street Address</Label>
                    <Input
                      id="streetAddress"
                      className="mt-1"
                      value={form.streetAddress}
                      onChange={setField("streetAddress")}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        className="mt-1"
                        value={form.city}
                        onChange={setField("city")}
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        className="mt-1"
                        value={form.state}
                        onChange={setField("state")}
                      />
                    </div>
                    <div>
                      <Label htmlFor="zipCode">Zip Code</Label>
                      <Input
                        id="zipCode"
                        className="mt-1"
                        value={form.zipCode}
                        onChange={setField("zipCode")}
                      />
                    </div>
                  </div>
                </section>

                {/* Customer classification */}
                <section className="space-y-3 rounded-xl bg-muted/30 p-4 ring-1 ring-foreground/10">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Customer Classification
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Customer Groups</Label>
                      <div className="mt-1 max-h-32 space-y-1 overflow-auto rounded-lg bg-background p-2 ring-1 ring-foreground/10">
                        {groups.length === 0 && (
                          <div className="text-xs text-muted-foreground">
                            No customer groups configured.
                          </div>
                        )}
                        {groups.map((g) => (
                          <label
                            key={g.id}
                            className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={customerGroupIds.includes(g.id)}
                              onCheckedChange={() => toggleGroup(g.id)}
                            />
                            {g.name}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label>Customer Type *</Label>
                      <Select
                        items={[
                          { value: "none", label: "None" },
                          ...customerTypes.map((t) => ({
                            value: t.id,
                            label: t.name,
                          })),
                        ]}
                        value={form.customerTypeId}
                        onValueChange={(value) =>
                          setForm((f) => ({ ...f, customerTypeId: value }))
                        }>
                        <SelectTrigger className="mt-1 w-full">
                          <SelectValue placeholder="Select customer type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {customerTypes.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </section>

                {/* MJ Medical */}
                {isMjMedical && (
                  <section className="space-y-3 rounded-xl bg-destructive/5 p-4 ring-1 ring-destructive/30">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-destructive">
                      <Stethoscope className="h-4 w-4" />
                      Medical Information (required for medical patients)
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="medicalLicense">
                          Medical License Number *
                        </Label>
                        <Input
                          id="medicalLicense"
                          className="mt-1"
                          value={form.medicalLicense}
                          onChange={setField("medicalLicense")}
                          onBlur={handleVerifyMedicalLicense}
                        />
                      </div>
                      <div>
                        <Label htmlFor="medicalLicenseExpiresAt">
                          License Expiration
                        </Label>
                        <Input
                          id="medicalLicenseExpiresAt"
                          type="date"
                          className="mt-1"
                          min={todayISO()}
                          value={form.medicalLicenseExpiresAt}
                          onChange={setField("medicalLicenseExpiresAt")}
                        />
                      </div>
                      <div>
                        <Label htmlFor="condition">Medical Condition</Label>
                        <Input
                          id="condition"
                          className="mt-1"
                          value={form.condition}
                          onChange={setField("condition")}
                        />
                      </div>
                      <div>
                        <Label htmlFor="physician">Physician Name</Label>
                        <Input
                          id="physician"
                          className="mt-1"
                          value={form.physician}
                          onChange={setField("physician")}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 rounded-lg bg-background p-2 ring-1 ring-foreground/10">
                      <label className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                        Temporary Patient
                        <Checkbox
                          checked={temporaryPatient}
                          onCheckedChange={(c) => setTemporaryPatient(!!c)}
                        />
                      </label>
                      <label className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                        Has Caregiver
                        <Checkbox
                          checked={hasCaregiver}
                          onCheckedChange={(c) => {
                            setHasCaregiver(!!c);
                            if (c) setIsCaregiver(false);
                          }}
                        />
                      </label>
                      <label className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
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
                          <Label htmlFor="careGiverName">Caregiver Name</Label>
                          <Input
                            id="careGiverName"
                            className="mt-1"
                            value={form.careGiverName}
                            onChange={setField("careGiverName")}
                          />
                        </div>
                        <div>
                          <Label htmlFor="careGiverLicense">
                            Caregiver License
                          </Label>
                          <Input
                            id="careGiverLicense"
                            className="mt-1"
                            value={form.careGiverLicense}
                            onChange={setField("careGiverLicense")}
                          />
                        </div>
                      </div>
                    )}

                    {isCaregiver && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="patientName">Patient Name</Label>
                          <Input
                            id="patientName"
                            className="mt-1"
                            value={form.patientName}
                            onChange={setField("patientName")}
                          />
                        </div>
                        <div>
                          <Label htmlFor="patientLicense">
                            Patient License
                          </Label>
                          <Input
                            id="patientLicense"
                            className="mt-1"
                            value={form.patientLicense}
                            onChange={setField("patientLicense")}
                          />
                        </div>
                      </div>
                    )}
                  </section>
                )}

                {/* Additional information */}
                <section className="space-y-3 rounded-xl bg-muted/30 p-4 ring-1 ring-foreground/10">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    Notes &amp; Referral
                  </h4>
                  <div>
                    <Label htmlFor="referralSource">Referral Source</Label>
                    <Input
                      id="referralSource"
                      className="mt-1"
                      list="referral-source-options"
                      placeholder="Select or type a referral source"
                      value={form.referralSource}
                      onChange={setField("referralSource")}
                    />
                    <datalist id="referral-source-options">
                      {REFERRAL_SOURCE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <Label htmlFor="note">Notes</Label>
                    <textarea
                      id="note"
                      rows={3}
                      className="mt-1 w-full rounded-lg bg-background px-2.5 py-1.5 text-sm ring-1 ring-foreground/10 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                      value={form.note}
                      onChange={setField("note")}
                    />
                  </div>
                </section>

                {/* Account settings */}
                <section className="space-y-3 rounded-xl bg-muted/30 p-4 ring-1 ring-foreground/10">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                    Account Settings
                  </h4>
                  <label className="flex items-center justify-between gap-2 rounded-lg bg-background p-3 text-sm ring-1 ring-foreground/10">
                    <div>
                      <div className="font-semibold">
                        {accountActive ? "Account Active" : "Account Disabled"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {accountActive
                          ? "Customer can log in and make purchases"
                          : "Customer is blocked from purchases"}
                      </div>
                    </div>
                    <Checkbox
                      checked={accountActive}
                      onCheckedChange={(c) => setAccountActive(!!c)}
                    />
                  </label>

                  <label className="flex items-center justify-between gap-2 rounded-lg bg-background p-3 text-sm ring-1 ring-foreground/10">
                    <div>
                      <div className="font-semibold">
                        Warn Cashier on this Customer
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Show a warning message to the cashier at checkout
                      </div>
                    </div>
                    <Checkbox
                      checked={shouldWarnUser}
                      onCheckedChange={(c) => setShouldWarnUser(!!c)}
                    />
                  </label>

                  {shouldWarnUser && (
                    <div>
                      <Label htmlFor="warningMessage">Warning Message</Label>
                      <textarea
                        id="warningMessage"
                        rows={2}
                        className="mt-1 w-full rounded-lg bg-background px-2.5 py-1.5 text-sm ring-1 ring-foreground/10 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                        value={warningMessage}
                        onChange={(e) => setWarningMessage(e.target.value)}
                      />
                    </div>
                  )}
                </section>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    reset();
                    onClose?.();
                  }}>
                  Cancel
                </Button>
                <div className="flex flex-wrap gap-2">
                  {isEditMode ? (
                    <Button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleSubmit("save")}>
                      {submitting ? "Saving…" : "Save Changes"}
                    </Button>
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={submitting}
                        onClick={() => handleSubmit("queue")}>
                        {submitting && saveMode === "queue"
                          ? "Saving…"
                          : "Save & Add to Queue"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={submitting}
                        onClick={() => handleSubmit("order")}>
                        {submitting && saveMode === "order"
                          ? "Saving…"
                          : "Save and Order"}
                      </Button>
                      <Button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleSubmit("save")}>
                        {submitting && saveMode === "save"
                          ? "Saving…"
                          : "Save Customer"}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </form>
          )}
        </div>
      </Drawer>

      <Drawer
        open={pinOpen}
        onClose={() => setPinOpen(false)}
        side="right"
        size={400}
        zIndex={zIndex + 10}>
        <div className="flex h-full flex-col">
          <div className="border-b border-border px-6 py-4 text-base font-semibold">
            Enter Pin
          </div>
          <div className="flex-1 overflow-auto p-4">
            <EnterPin
              onDone={() => {
                setPinOpen(false);
                const action = pendingSubmitRef.current;
                pendingSubmitRef.current = null;
                if (action) action();
              }}
            />
          </div>
        </div>
      </Drawer>
    </>
  );
}
