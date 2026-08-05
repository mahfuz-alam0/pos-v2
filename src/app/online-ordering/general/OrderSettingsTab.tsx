"use client";

import { useState } from "react";
import { Apple, Bot, Globe } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

const PLATFORMS = [
  { key: "ios", name: "iOS", icon: Apple },
  { key: "android", name: "Android", icon: Bot },
  { key: "web", name: "Web (eComm)", icon: Globe },
] as const;

export default function OrderSettingsTab() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({ ios: true, android: true, web: true });

  return (
    <Card>
      <CardContent>
        <h2 className="text-sm font-semibold">Platform Configuration</h2>
        <p className="mb-4 text-sm text-muted-foreground">Manage menu visibility across all platforms</p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {PLATFORMS.map(({ key, name, icon: Icon }) => (
            <div key={key} className="flex flex-col items-center gap-3 rounded-lg bg-muted p-4 text-center">
              <Icon className="size-6 text-muted-foreground" />
              <span className="text-sm font-medium">{name}</span>
              <div className="flex items-center gap-2">
                <Switch checked={enabled[key]} onCheckedChange={(v) => setEnabled((prev) => ({ ...prev, [key]: v }))} />
                <span className="text-xs text-muted-foreground">{enabled[key] ? "Visible" : "Hidden"}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
