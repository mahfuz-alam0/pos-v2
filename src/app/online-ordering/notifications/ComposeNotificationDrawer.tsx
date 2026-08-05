"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Bell, Loader2, MessageSquare, Send, Tags, Users, X } from "lucide-react";

import { cn } from "@/lib/utils";
import Drawer from "@/components/ui/Drawer";
import { listBusinessEntities } from "@/services/businessEntities/list";
import { fetchShopsData } from "@/services/shops/list";
import { listAllDeals } from "@/services/sales/listDeals";
import { listAllCoupons } from "@/services/sales/listCoupons";
import { listCustomerTypes } from "@/services/customers/listCustomerTypes";
import { fetchCustomerGroups } from "@/services/customerGroups/list";
import { createNotification } from "@/services/notifications/create";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { MultiApiSelect } from "@/components/ui/multi-api-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SimpleFileUpload, { type UploadedDoc } from "@/app/inventory-management/packages/SimpleFileUpload";

type Subject = "DEAL" | "COUPON" | "OTHER";

interface ComposeNotificationDrawerProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

function SectionHeading({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="mb-4 flex items-center gap-1.5 border-b pb-2.5 text-xs font-semibold tracking-wide text-primary uppercase">
      {icon}
      {text}
    </div>
  );
}

export default function ComposeNotificationDrawer({ open, onClose, onCreated }: ComposeNotificationDrawerProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [entities, setEntities] = useState<{ id: string; name: string }[]>([]);
  const [entityId, setEntityId] = useState<string | null>(null);

  const [shops, setShops] = useState<any[]>([]);
  const [shopIds, setShopIds] = useState<string[]>([]);
  const [timeZone, setTimeZone] = useState<string>(
    typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "US/Pacific"
  );

  const [customerTypes, setCustomerTypes] = useState<any[]>([]);
  const [customerTypeIds, setCustomerTypeIds] = useState<string[]>([]);
  const [customerGroups, setCustomerGroups] = useState<any[]>([]);
  const [customerGroupIds, setCustomerGroupIds] = useState<string[]>([]);

  const [subject, setSubject] = useState<Subject>("DEAL");
  const [deals, setDeals] = useState<any[]>([]);
  const [dealId, setDealId] = useState<string | null>(null);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [couponId, setCouponId] = useState<string | null>(null);

  const [pushEnabled, setPushEnabled] = useState(true);
  const [inAppEnabled, setInAppEnabled] = useState(true);
  const [scheduleForLater, setScheduleForLater] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  const [scheduledTime, setScheduledTime] = useState("");

  const [images, setImages] = useState<UploadedDoc[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const availableTimeZones = useMemo(() => {
    const zones = shops.filter((s) => shopIds.includes(s.id)).map((s) => s.timeZone).filter(Boolean);
    return [...new Set(zones)];
  }, [shops, shopIds]);

  useEffect(() => {
    if (availableTimeZones.length === 1) setTimeZone(availableTimeZones[0]);
  }, [availableTimeZones]);

  // Reset to a blank form every time the drawer opens.
  useEffect(() => {
    if (!open) return;
    setTitle("");
    setDescription("");
    setEntityId(null);
    setShopIds([]);
    setCustomerTypeIds([]);
    setCustomerGroupIds([]);
    setSubject("DEAL");
    setDealId(null);
    setCouponId(null);
    setPushEnabled(true);
    setInAppEnabled(true);
    setScheduleForLater(false);
    setScheduledDate(undefined);
    setScheduledTime("");
    setImages([]);
    setErrors({});
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listBusinessEntities().then((res) => setEntities(res?.data?.data?.businessEntities ?? [])).catch(() => {});
    fetchShopsData().then((res) => setShops(res.data || []));
    listAllDeals().then((res) => setDeals(res?.data?.data?.deals ?? [])).catch(() => {});
    listAllCoupons().then((res) => setCoupons(res?.data?.data?.coupons ?? [])).catch(() => {});
    listCustomerTypes().then((res) => setCustomerTypes(res?.data?.data?.customerTypes ?? [])).catch(() => {});
    fetchCustomerGroups().then((res) => setCustomerGroups(res?.data?.data?.customerGroups ?? [])).catch(() => {});
  }, [open]);

  const shopOptions = shops.map((s) => ({ id: s.id, name: s.timeZone ? `${s.name} (${s.timeZone})` : s.name }));
  const customerTypeOptions = customerTypes.map((c) => ({ id: c.id, name: c.name }));
  const customerGroupOptions = customerGroups.map((c) => ({ id: c.id, name: c.name }));

  const formatTwelveHour = (time: string) => {
    if (!time) return undefined;
    const [h, m] = time.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${String(hour12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
  };

  const handleSubmit = async () => {
    if (submitting) return;

    const nextErrors: Record<string, boolean> = {
      title: !title.trim(),
      description: !description.trim(),
      shopIds: shopIds.length === 0,
      customerGroupIds: customerGroupIds.length === 0,
      dealId: subject === "DEAL" && !dealId,
      couponId: subject === "COUPON" && !couponId,
      images: images.length === 0,
      schedule: scheduleForLater && (!scheduledDate || !scheduledTime),
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      return toast.error("Please fill in the highlighted fields");
    }

    const selectedCoupon = coupons.find((c) => c.id === couponId);

    setSubmitting(true);
    try {
      const payload: Record<string, any> = {
        title,
        description,
        subject,
        tenantIds: shopIds,
        customerTypeIds,
        customerGroupIds,
        shouldSendLater: scheduleForLater,
        shouldSendPushNotification: pushEnabled,
        shouldSendInAppNotification: inAppEnabled,
        sendAtDate: scheduleForLater && scheduledDate ? scheduledDate.toISOString().slice(0, 10) : undefined,
        sendAtTwelveHours: scheduleForLater ? formatTwelveHour(scheduledTime) : undefined,
        timeZone: timeZone || "US/Pacific",
        imageUrl: images[0]?.url,
        businessEntityId: entityId || null,
        ...(subject === "DEAL" && { dealId }),
        ...(subject === "COUPON" && { couponId, couponCode: selectedCoupon?.couponCode }),
      };

      const res = await createNotification(payload);
      if (!res?.data) throw new Error("Failed to create notification");
      toast.success("Notification created successfully");
      onCreated();
    } catch (err: any) {
      const errs = err?.errors;
      toast.error(Array.isArray(errs) ? errs.join("; ") : err?.message || "Failed to create notification");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer open={open} onClose={submitting ? undefined : onClose} side="right" size="90%">
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 px-6 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Bell className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold leading-tight">Add Notification</div>
            <div className="text-xs leading-tight text-muted-foreground">Create and send a new notification</div>
          </div>

          <Select
            items={[{ value: "__none__", label: "Select business entity" }, ...entities.map((e) => ({ value: e.id, label: e.name }))]}
            value={entityId ?? "__none__"}
            onValueChange={(v) => setEntityId(v === "__none__" ? null : (v as string))}
          >
            <SelectTrigger className="w-60">
              <SelectValue placeholder="Select business entity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {entities.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon-sm" onClick={onClose} disabled={submitting}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card className="p-5">
              <SectionHeading icon={<MessageSquare className="size-4" />} text="Basic Information" />
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>
                    Notification Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (errors.title) setErrors((p) => ({ ...p, title: false }));
                    }}
                    placeholder="Enter notification title"
                    aria-invalid={errors.title}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>
                    Description <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    rows={4}
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      if (errors.description) setErrors((p) => ({ ...p, description: false }));
                    }}
                    placeholder="Write your notification message here..."
                    aria-invalid={errors.description}
                  />
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <SectionHeading icon={<Users className="size-4" />} text="Target Audience" />
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>
                    Select Shops <span className="text-destructive">*</span>
                  </Label>
                  <MultiApiSelect
                    placeholder="Select Shops"
                    items={shopOptions}
                    value={shopIds}
                    onChange={(v) => {
                      setShopIds(v);
                      if (errors.shopIds) setErrors((p) => ({ ...p, shopIds: false }));
                    }}
                    triggerClassName={cn("w-full", errors.shopIds && "border-destructive ring-3 ring-destructive/20")}
                  />
                </div>

                {availableTimeZones.length > 1 && (
                  <div className="flex flex-col gap-1.5">
                    <Label>Select Time Zone</Label>
                    <Select items={availableTimeZones.map((tz) => ({ value: tz, label: tz }))} value={timeZone} onValueChange={(v) => setTimeZone(v as string)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Time Zone" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTimeZones.map((tz) => (
                          <SelectItem key={tz} value={tz}>
                            {tz}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {availableTimeZones.length === 1 && (
                  <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400">
                    Time Zone: <strong>{availableTimeZones[0]}</strong>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <Label>Customer Type</Label>
                  <MultiApiSelect placeholder="Select Customer Type" items={customerTypeOptions} value={customerTypeIds} onChange={setCustomerTypeIds} triggerClassName="w-full" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>
                    Customer Groups <span className="text-destructive">*</span>
                  </Label>
                  <MultiApiSelect
                    placeholder="Select Customer Groups"
                    items={customerGroupOptions}
                    value={customerGroupIds}
                    onChange={(v) => {
                      setCustomerGroupIds(v);
                      if (errors.customerGroupIds) setErrors((p) => ({ ...p, customerGroupIds: false }));
                    }}
                    triggerClassName={cn("w-full", errors.customerGroupIds && "border-destructive ring-3 ring-destructive/20")}
                  />
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <SectionHeading icon={<Tags className="size-4" />} text="Content Settings" />
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>Subject Type</Label>
                  <Select
                    items={[
                      { value: "DEAL", label: "Deal" },
                      { value: "COUPON", label: "Coupon" },
                      { value: "OTHER", label: "Other" },
                    ]}
                    value={subject}
                    onValueChange={(v) => setSubject(v as Subject)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DEAL">Deal</SelectItem>
                      <SelectItem value="COUPON">Coupon</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {subject === "DEAL" && (
                  <div className="flex flex-col gap-1.5">
                    <Label>
                      Select Deal <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      items={[{ value: "__none__", label: "Select deal" }, ...deals.map((d) => ({ value: d.id, label: d.name }))]}
                      value={dealId ?? "__none__"}
                      onValueChange={(v) => {
                        setDealId(v === "__none__" ? null : (v as string));
                        if (errors.dealId) setErrors((p) => ({ ...p, dealId: false }));
                      }}
                    >
                      <SelectTrigger className={cn("w-full", errors.dealId && "border-destructive ring-3 ring-destructive/20")}>
                        <SelectValue placeholder="Select deal" />
                      </SelectTrigger>
                      <SelectContent>
                        {deals.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {subject === "COUPON" && (
                  <div className="flex flex-col gap-1.5">
                    <Label>
                      Select Coupon <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      items={[{ value: "__none__", label: "Select coupon" }, ...coupons.map((c) => ({ value: c.id, label: c.name }))]}
                      value={couponId ?? "__none__"}
                      onValueChange={(v) => {
                        setCouponId(v === "__none__" ? null : (v as string));
                        if (errors.couponId) setErrors((p) => ({ ...p, couponId: false }));
                      }}
                    >
                      <SelectTrigger className={cn("w-full", errors.couponId && "border-destructive ring-3 ring-destructive/20")}>
                        <SelectValue placeholder="Select Coupon" />
                      </SelectTrigger>
                      <SelectContent>
                        {coupons.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-5">
              <SectionHeading icon={<Bell className="size-4" />} text="Delivery & Scheduling" />
              <div className="flex flex-col gap-4">
                <div>
                  <div className="mb-2 text-sm font-medium text-muted-foreground">Notification Types</div>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={pushEnabled} onCheckedChange={(c) => setPushEnabled(!!c)} />
                      Push Notifications
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={inAppEnabled} onCheckedChange={(c) => setInAppEnabled(!!c)} />
                      In-App Notifications
                    </label>
                  </div>
                </div>

                <div className="border-t pt-3.5">
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Checkbox checked={scheduleForLater} onCheckedChange={(c) => setScheduleForLater(!!c)} />
                    Schedule For Later
                  </label>

                  {scheduleForLater && (
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Label className="mb-1.5">
                          Date <span className="text-destructive">*</span>
                        </Label>
                        <DatePicker
                          value={scheduledDate}
                          onChange={(d) => {
                            setScheduledDate(d);
                            if (errors.schedule) setErrors((p) => ({ ...p, schedule: false }));
                          }}
                          placeholder="Select date"
                          className={errors.schedule ? "border-destructive ring-3 ring-destructive/20" : undefined}
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="mb-1.5">
                          Time <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          type="time"
                          value={scheduledTime}
                          onChange={(e) => {
                            setScheduledTime(e.target.value);
                            if (errors.schedule) setErrors((p) => ({ ...p, schedule: false }));
                          }}
                          aria-invalid={errors.schedule}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          <Card className={cn("mt-4 p-5", errors.images && "border-destructive")}>
            <SectionHeading icon={<Bell className="size-4" />} text="Notification Image *" />
            <SimpleFileUpload
              files={images}
              onChange={(files) => {
                setImages(files);
                if (errors.images) setErrors((p) => ({ ...p, images: false }));
              }}
              maxCount={1}
              accept="image/jpeg,image/jpg,image/png"
              hint="JPG or PNG · max 1 file"
            />
            {errors.images && <p className="mt-1.5 text-xs text-destructive">Please upload an image</p>}
          </Card>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="min-w-40">
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send />}
            Create Notification
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
