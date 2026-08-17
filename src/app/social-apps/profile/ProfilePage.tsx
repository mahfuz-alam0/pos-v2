"use client";

import { useEffect, useState } from "react";
import { KeyRound, QrCode, UserRound } from "lucide-react";

import { getProfile, type MyProfile } from "@/services/profile/getProfile";
import { useCurrentUser } from "@/util/use-current-user";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

import PersonalDetailsTab from "./PersonalDetailsTab";
import PersonalPinTab from "./PersonalPinTab";
import QrCodeTab from "./QrCodeTab";

export default function ProfilePage() {
  const user = useCurrentUser();
  const [profile, setProfile] = useState<MyProfile | null>(null);

  useEffect(() => {
    getProfile()
      .then((p) => p && setProfile(p))
      .catch(() => {});
  }, []);

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex w-full flex-col gap-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Account</BreadcrumbPage>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="font-medium text-primary">Profile</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex items-center gap-4 pb-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <img
            src={profile?.avatarUrl || "/images/avatar.png"}
            alt=""
            className="size-16 shrink-0 rounded-full object-cover"
          />
          <div className="min-w-0">
            <div className="truncate text-lg font-semibold">{profile?.name || user?.name || "Account"}</div>
            <div className="truncate text-sm text-muted-foreground">{profile?.email}</div>
            {user?.type && (
              <div className="text-xs text-muted-foreground">{user.type.replaceAll("_", " ")}</div>
            )}
          </div>
        </div>

        <Tabs defaultValue="details">
          <TabsList variant="line" className="h-auto w-full justify-start gap-1 pb-px">
            <TabsTrigger value="details" className="gap-1.5 rounded-md px-3 py-2 text-sm data-active:bg-primary/10">
              <UserRound className="size-4" />
              Personal Details
            </TabsTrigger>
            <TabsTrigger value="pin" className="gap-1.5 rounded-md px-3 py-2 text-sm data-active:bg-primary/10">
              <KeyRound className="size-4" />
              Personal PIN
            </TabsTrigger>
            <TabsTrigger value="qr" className="gap-1.5 rounded-md px-3 py-2 text-sm data-active:bg-primary/10">
              <QrCode className="size-4" />
              QR Code
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4">
            <PersonalDetailsTab onSaved={(patch) => setProfile((prev) => (prev ? { ...prev, ...patch } : prev))} />
          </TabsContent>
          <TabsContent value="pin" className="mt-4">
            <PersonalPinTab />
          </TabsContent>
          <TabsContent value="qr" className="mt-4">
            <QrCodeTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
