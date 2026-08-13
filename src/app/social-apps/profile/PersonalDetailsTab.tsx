"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

import { getProfile } from "@/services/profile/getProfile";
import { updateProfile } from "@/services/profile/updateProfile";
import { fetchCountryCodes } from "@/services/countries/list";
import { AUTH_CHANGE_EVENT } from "@/util/use-auth";
import { getCurrentUser } from "@/util/use-current-user";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, SingleImageUpload, DocumentsUpload } from "@/components/admin/form-fields";

interface CountryOption {
  countryCode: string;
  countryName: string;
}

export default function PersonalDetailsTab({
  onSaved,
}: {
  onSaved: (patch: { name: string; avatarUrl: string | null }) => void;
}) {
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("US");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [documentLinks, setDocumentLinks] = useState<string[]>([]);

  useEffect(() => {
    fetchCountryCodes().then((res) => setCountries(res?.data ?? []));
    getProfile()
      .then((profile) => {
        if (!profile) return;
        setName(profile.name ?? "");
        setEmail(profile.email ?? "");
        setCountryCode(profile.countryCode ?? "US");
        // PhoneInput works with bare digits; the API stores/returns E.164.
        setPhone(profile.phone?.replace(/^\+/, "") ?? "");
        setAvatarUrl(profile.avatarUrl ?? null);
        setDocumentLinks(profile.documentLinks ?? []);
      })
      .catch((err: any) => toast.error(err?.message || "Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        name: name.trim(),
        countryCode: countryCode || null,
        phone: phone ? `+${phone}` : null,
        avatarUrl,
        documentLinks,
      });

      // Keep the cached user in sync so the sidebar avatar/name update without a reload.
      const user = getCurrentUser();
      if (user) {
        localStorage.setItem("userInfo", JSON.stringify({ ...user, name: name.trim(), avatarUrl: avatarUrl ?? undefined }));
        window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
      }

      onSaved({ name: name.trim(), avatarUrl });
      toast.success("Profile updated successfully");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex max-w-2xl flex-col gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <Field label="Profile Picture">
        <SingleImageUpload imageUrl={avatarUrl} onChange={setAvatarUrl} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" />
        </Field>

        <Field label="Email Address">
          <Input value={email} readOnly disabled />
        </Field>

        <Field label="Country">
          <Select
            items={countries.map((c) => ({ value: c.countryCode, label: c.countryName }))}
            value={countryCode}
            onValueChange={setCountryCode}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              {countries.map((c) => (
                <SelectItem key={c.countryCode} value={c.countryCode}>
                  {c.countryName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Phone Number">
          <PhoneInput
            country={countryCode.toLowerCase()}
            enableSearch
            value={phone}
            onChange={setPhone}
            inputClass="!w-full !h-9"
          />
        </Field>
      </div>

      <Field label="Documents">
        <DocumentsUpload links={documentLinks} onChange={setDocumentLinks} />
      </Field>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="size-4 animate-spin" />}
          Update
        </Button>
      </div>
    </div>
  );
}
