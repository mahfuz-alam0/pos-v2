"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bell, Loader2, MessageSquare, Send, Tags, Users } from "lucide-react";

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
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import SimpleFileUpload, { type UploadedDoc } from "@/app/admin/inventory/packages/SimpleFileUpload";

type Subject = "DEAL" | "COUPON" | "OTHER";

function SectionHeading({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="mb-4 flex items-center gap-1.5 border-b pb-2.5 text-xs font-semibold tracking-wide text-primary uppercase">
      {icon}
      {text}
    </div>
  );
}

export default function ComposeNotificationForm() {
  const router = useRouter();

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

  const availableTimeZones = useMemo(() => {
    const zones = shops.filter((s) => shopIds.includes(s.id)).map((s) => s.timeZone).filter(Boolean);
    return [...new Set(zones)];
  }, [shops, shopIds]);

  useEffect(() => {
    if (availableTimeZones.length === 1) setTimeZone(availableTimeZones[0]);
  }, [availableTimeZones]);

  useEffect(() => {
    listBusinessEntities().then((res) => setEntities(res?.data?.data?.businessEntities ?? [])).catch(() => {});
    fetchShopsData().then((res) => setShops(res.data || []));
    listAllDeals().then((res) => setDeals(res?.data?.data?.deals ?? [])).catch(() => {});
    listAllCoupons().then((res) => setCoupons(res?.data?.data?.coupons ?? [])).catch(() => {});
    listCustomerTypes().then((res) => setCustomerTypes(res?.data?.data?.customerTypes ?? [])).catch(() => {});
    fetchCustomerGroups().then((res) => setCustomerGroups(res?.data?.data?.customerGroups ?? [])).catch(() => {});
  }, []);

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
    if (!title.trim()) return toast.error("Please input title!");
    if (!description.trim()) return toast.error("Please input description!");
    if (shopIds.length === 0) return toast.error("Please select at least one shop");
    if (customerGroupIds.length === 0) return toast.error("Please select customer groups!");
    if (subject === "DEAL" && !dealId) return toast.error("Please select a deal");
    if (subject === "COUPON" && !couponId) return toast.error("Please select a coupon");
    if (images.length === 0) return toast.error("Please upload an image!");
    if (scheduleForLater && (!scheduledDate || !scheduledTime)) return toast.error("Please select date and time!");

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
      router.push("/bleaum/notification/my-notification");
    } catch (err: any) {
      const errors = err?.errors;
      toast.error(Array.isArray(errors) ? errors.join("; ") : err?.message || "Failed to create notification");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Notification</BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Add Notification</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Add Notification</h1>
          <p className="text-sm text-muted-foreground">Create and send a new notification</p>
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
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="p-5">
          <SectionHeading icon={<MessageSquare className="size-4" />} text="Basic Information" />
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Notification Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter notification title" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Description</Label>
              <Textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Write your notification message here..."
              />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeading icon={<Users className="size-4" />} text="Target Audience" />
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Select Shops</Label>
              <MultiApiSelect placeholder="Select Shops" items={shopOptions} value={shopIds} onChange={setShopIds} triggerClassName="w-full" />
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
              <Label>Customer Groups</Label>
              <MultiApiSelect placeholder="Select Customer Groups" items={customerGroupOptions} value={customerGroupIds} onChange={setCustomerGroupIds} triggerClassName="w-full" />
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
                <Label>Select Deal</Label>
                <Select
                  items={[{ value: "__none__", label: "Select deal" }, ...deals.map((d) => ({ value: d.id, label: d.name }))]}
                  value={dealId ?? "__none__"}
                  onValueChange={(v) => setDealId(v === "__none__" ? null : (v as string))}
                >
                  <SelectTrigger className="w-full">
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
                <Label>Select Coupon</Label>
                <Select
                  items={[{ value: "__none__", label: "Select coupon" }, ...coupons.map((c) => ({ value: c.id, label: c.name }))]}
                  value={couponId ?? "__none__"}
                  onValueChange={(v) => setCouponId(v === "__none__" ? null : (v as string))}
                >
                  <SelectTrigger className="w-full">
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
                    <Label className="mb-1.5">Date</Label>
                    <DatePicker value={scheduledDate} onChange={setScheduledDate} placeholder="Select date" />
                  </div>
                  <div className="flex-1">
                    <Label className="mb-1.5">Time</Label>
                    <Input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <SectionHeading icon={<Bell className="size-4" />} text="Notification Image" />
        <SimpleFileUpload files={images} onChange={setImages} maxCount={1} accept="image/jpeg,image/jpg,image/png" hint="JPG or PNG · max 1 file" />
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.push("/bleaum/notification/my-notification")}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={submitting} className="min-w-40">
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send />}
          Create Notification
        </Button>
      </div>
    </div>
  );
}
