"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FileText, History, Pencil, Trash2, TriangleAlert } from "lucide-react";
import { getSingleCustomer } from "@/services/customers/getSingleCustomer";
import { setCustomerNotes } from "@/services/customers/setCustomerNotes";
import { Button } from "@/components/ui/button";
import Drawer from "@/components/ui/Drawer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";

// Fixed-customer version of pos/CustomerUploads.tsx's notes tab — no customer
// picker here, the customer is already chosen (the queue card that was clicked).
export default function NotesSection({ customerId }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    if (!customerId) return;
    setLoading(true);
    getSingleCustomer(customerId)
      .then((res) => setDetail(res?.data?.data?.customer || null))
      .finally(() => setLoading(false));
  };

  useEffect(load, [customerId]);

  async function handleSave() {
    if (!noteDraft.trim()) {
      toast.warning("Please enter a description");
      return;
    }
    try {
      await setCustomerNotes({ id: customerId, noteSubject: detail?.noteSubject || "", note: noteDraft });
      toast.success("Note saved successfully");
      setDrawerOpen(false);
      setNoteDraft("");
      load();
    } catch (err) {
      toast.error(err?.message || "Failed to save note");
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await setCustomerNotes({ id: customerId, noteSubject: "", note: "" });
      toast.success("Note deleted successfully");
      load();
    } catch (err) {
      toast.error(err?.message || "Failed to delete note");
    } finally {
      setDeleting(false);
      setConfirmDeleteOpen(false);
    }
  }

  if (loading) return <div className="py-8 text-center text-sm text-muted-foreground">Loading notes…</div>;

  const hasCurrentNote = Boolean(detail?.note || detail?.noteSubject);
  const previousNotes = Array.isArray(detail?.notesHistory) ? detail.notesHistory.filter(Boolean) : [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => {
            setNoteDraft(detail?.note || "");
            setDrawerOpen(true);
          }}
        >
          {hasCurrentNote ? "Edit Note" : "Add Note"}
        </Button>
      </div>

      {detail?.shouldWarnUser && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <TriangleAlert className="mt-0.5 h-5 w-5 text-amber-600" />
          <div>
            <div className="mb-1 text-xs font-semibold tracking-wider text-amber-600 uppercase">Cashier Warning</div>
            <div className="text-sm whitespace-pre-wrap text-gray-700">
              {detail?.warningMessage || "This customer is flagged for a warning."}
            </div>
          </div>
        </div>
      )}

      {hasCurrentNote ? (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <div className="mb-1 text-xs font-semibold tracking-wider text-blue-500 uppercase">Current Note</div>
                {detail?.noteSubject && <div className="mb-1 text-base font-semibold text-gray-800">{detail.noteSubject}</div>}
                <div className="text-sm whitespace-pre-wrap text-gray-600">{detail?.note || "-"}</div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {detail?.updatedAt && <span className="mr-2 text-xs whitespace-nowrap text-gray-400">{fmtDate(detail.updatedAt)}</span>}
              <Button variant="ghost" size="icon" onClick={() => { setNoteDraft(detail?.note || ""); setDrawerOpen(true); }}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" disabled={deleting} onClick={() => setConfirmDeleteOpen(true)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        </div>
      ) : previousNotes.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">No notes yet for this customer</div>
      ) : null}

      {previousNotes.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <History className="h-4 w-4 text-gray-400" />
            <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase">Previous Notes</span>
          </div>
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {previousNotes.slice().reverse().map((text, i) => (
              <div key={i} className="flex items-start gap-3 p-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-gray-500">
                  {previousNotes.length - i}
                </span>
                <span className="text-sm whitespace-pre-wrap text-gray-600">{text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Drawer open={drawerOpen} onClose={() => { setDrawerOpen(false); setNoteDraft(""); }} side="right" size={480}>
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-lg font-semibold">{hasCurrentNote ? "Edit Note" : "Add Note"}</h2>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <textarea
              className="min-h-32 w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              placeholder="Write your note here…"
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
            <Button variant="outline" onClick={() => { setDrawerOpen(false); setNoteDraft(""); }}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Note</Button>
          </div>
        </div>
      </Drawer>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this note?</AlertDialogTitle>
            <AlertDialogDescription>This removes the current note and cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
