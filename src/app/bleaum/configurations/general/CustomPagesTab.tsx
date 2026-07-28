"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { getEulaPage } from "@/services/eula/getEulaPage";
import { updateEulaPage } from "@/services/eula/updateEulaPage";

const PAGES = [
  { name: "Terms & Conditions", type: "TERMS_AND_CONDITIONS" },
  { name: "Privacy Policy", type: "PRIVACY_POLICY" },
] as const;

export default function CustomPagesTab() {
  const [editing, setEditing] = useState<(typeof PAGES)[number] | null>(null);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [body, setBody] = useState("");
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleEdit = async (page: (typeof PAGES)[number]) => {
    setEditing(page);
    setFetching(true);
    try {
      const res = await getEulaPage(page.type);
      const pageData = res?.data?.data?.pageData;
      setTitle(pageData?.title || "");
      setSubtitle(pageData?.description || "");
      setBody(pageData?.contentHTML || "");
    } catch (err: any) {
      toast.error(err?.message || "Failed to fetch page data");
    } finally {
      setFetching(false);
    }
  };

  const handleBack = () => {
    setEditing(null);
    setTitle("");
    setSubtitle("");
    setBody("");
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!title || !subtitle) {
      toast.error("Please enter title and subtitle");
      return;
    }
    setSaving(true);
    try {
      await updateEulaPage({ type: editing.type, title, description: subtitle, contentHTML: body });
      toast.success("Page content saved successfully!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save page content");
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {PAGES.map((page) => (
              <TableRow key={page.type}>
                <TableCell>{page.name}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(page)}>
                    <Pencil className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Button variant="outline" size="sm" onClick={handleBack} className="mb-4">
          <ArrowLeft className="size-4" />
          Back to Pages
        </Button>

        {fetching ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="max-w-sm">
              <Label className="mb-2 text-muted-foreground">Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter title" />
            </div>
            <div className="max-w-sm">
              <Label className="mb-2 text-muted-foreground">Subtitle</Label>
              <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Enter subtitle" />
            </div>
            <div>
              <Label className="mb-2 text-muted-foreground">Body</Label>
              <Textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Enter page content" />
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
