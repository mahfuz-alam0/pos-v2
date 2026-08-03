"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, KeyRound } from "lucide-react";

import { changePassword } from "@/services/employees/changePassword";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

function PasswordField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <Label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pr-10"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          tabIndex={-1}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  );
}

export default function ChangePasswordForm() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmNewPassword) {
      toast.error("Please fill in all fields");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error("Confirm password does not match!");
      return;
    }
    setSaving(true);
    try {
      const res = await changePassword({ oldPassword, newPassword });
      toast.success(res?.data?.data?.message || "Password changed successfully.");
      setOldPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to change password!");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Settings</BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Reset Password</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card className="max-w-md">
        <div className="flex items-center gap-2 px-4 pb-3 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
            <KeyRound className="size-4" />
          </div>
          <h3 className="text-sm font-semibold">Change Password</h3>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4">
          <PasswordField id="oldPassword" label="Old Password" value={oldPassword} onChange={setOldPassword} />
          <PasswordField id="newPassword" label="New Password" value={newPassword} onChange={setNewPassword} />
          <PasswordField
            id="confirmNewPassword"
            label="Confirm New Password"
            value={confirmNewPassword}
            onChange={setConfirmNewPassword}
          />

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Submit"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
