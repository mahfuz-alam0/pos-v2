"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

import { getApiKey } from "@/services/apiKeys/getApiKey";
import { generateApiKey } from "@/services/apiKeys/generateApiKey";
import { getMyPin } from "@/services/profile/getMyPin";
import { getCurrentUser } from "@/util/use-current-user";
import { decryptPin } from "@/util/pin";

const PLATFORMS = [
  { key: "ios", label: "iOS", platform: "IOS" },
  { key: "android", label: "Android", platform: "ANDROID" },
  { key: "web", label: "Web", platform: "WEB" },
] as const;

type PlatformKey = (typeof PLATFORMS)[number]["key"];

export default function ApiKeysTab() {
  const [orgId, setOrgId] = useState("");
  const [keys, setKeys] = useState<Record<PlatformKey, string>>({ ios: "", android: "", web: "" });
  const [visible, setVisible] = useState<Record<PlatformKey, boolean>>({ ios: false, android: false, web: false });
  const [fetching, setFetching] = useState(true);
  const [encryptedPin, setEncryptedPin] = useState("");

  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformKey | null>(null);
  const [pin, setPin] = useState("");
  const [generating, setGenerating] = useState<PlatformKey | null>(null);

  useEffect(() => {
    setOrgId(getCurrentUser()?.orgId || "");
    fetchData();
  }, []);

  const fetchData = async () => {
    setFetching(true);
    try {
      const pinRes = await getMyPin();
      setEncryptedPin(pinRes?.data?.data?.pin || "");

      const newKeys: Record<PlatformKey, string> = { ios: "", android: "", web: "" };
      for (const { key, platform } of PLATFORMS) {
        try {
          const res = await getApiKey(platform);
          newKeys[key] = res?.data?.data?.apiKey || "";
        } catch {
          newKeys[key] = "";
        }
      }
      setKeys(newKeys);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load data");
    } finally {
      setFetching(false);
    }
  };

  const verifyPin = (entered: string) => {
    if (!encryptedPin) {
      toast.error("PIN verification not available");
      return false;
    }
    const decrypted = decryptPin(encryptedPin);
    if (!decrypted) {
      toast.error("Failed to verify PIN");
      return false;
    }
    return entered === decrypted;
  };

  const handleGenerateClick = (key: PlatformKey) => {
    setSelectedPlatform(key);
    setPinModalOpen(true);
  };

  const handleVerifyAndGenerate = async () => {
    if (!pin) {
      toast.error("Please enter your PIN");
      return;
    }
    if (!selectedPlatform || !verifyPin(pin)) {
      toast.error("Invalid PIN entered");
      return;
    }

    const platform = PLATFORMS.find((p) => p.key === selectedPlatform)!.platform;
    setPinModalOpen(false);
    setGenerating(selectedPlatform);
    try {
      const res = await generateApiKey({ platform, apiKey: keys[selectedPlatform], pin });
      if (res?.status === 200) {
        setKeys((prev) => ({ ...prev, [selectedPlatform]: res.data?.data?.apiKey || prev[selectedPlatform] }));
        toast.success(`${platform} key saved successfully`);
        fetchData();
      }
    } catch (err: any) {
      toast.error(err?.message || "An unexpected error occurred");
    } finally {
      setGenerating(null);
      setPin("");
      setSelectedPlatform(null);
    }
  };

  const handleCopy = (key: PlatformKey) => {
    if (!keys[key]) {
      toast.warning("No API key available to copy");
      return;
    }
    navigator.clipboard.writeText(keys[key]).then(
      () => toast.success("API Key copied"),
      () => toast.error("Failed to copy")
    );
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-6">
        <div>
          <Label className="mb-2 text-muted-foreground">App ID</Label>
          <div className="flex max-w-sm items-center gap-2">
            <Input value={orgId} disabled />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => {
                if (!orgId) {
                  toast.warning("No Org ID available to copy");
                  return;
                }
                navigator.clipboard.writeText(orgId).then(
                  () => toast.success("Org ID copied to clipboard"),
                  () => toast.error("Failed to copy Org ID")
                );
              }}
            >
              <Copy className="size-4" />
            </Button>
          </div>
        </div>

        <div className="flex max-w-md flex-col gap-4">
          {PLATFORMS.map(({ key, label }) => (
            <div key={key}>
              <Label className="mb-2 text-muted-foreground">{label}</Label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input type={visible[key] ? "text" : "password"} value={keys[key]} disabled placeholder={`Enter ${label} API Key`} />
                  <button
                    type="button"
                    onClick={() => setVisible((prev) => ({ ...prev, [key]: !prev[key] }))}
                    className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {visible[key] ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <Button type="button" variant="outline" size="icon" onClick={() => handleCopy(key)}>
                  <Copy className="size-4" />
                </Button>
                <Button type="button" onClick={() => handleGenerateClick(key)} disabled={generating === key || fetching}>
                  {generating === key ? "Generating..." : "Generate Api Key"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      <Dialog open={pinModalOpen} onOpenChange={setPinModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify PIN</DialogTitle>
          </DialogHeader>
          <div>
            <Label className="mb-2">Enter your PIN to save the API key:</Label>
            <Input
              type="password"
              placeholder="Enter PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleVerifyAndGenerate()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPinModalOpen(false);
                setPin("");
                setSelectedPlatform(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleVerifyAndGenerate}>Verify &amp; Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
