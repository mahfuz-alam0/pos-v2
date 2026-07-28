"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { FileText, History, Pencil, Trash2, TriangleAlert } from "lucide-react";

import { listCustomers } from "@/services/customers/listCustomers";
import { getSingleCustomer } from "@/services/customers/getSingleCustomer";
import { getCustomerFilters } from "@/services/customers/getCustomerFilters";
import { setCustomerNotes } from "@/services/customers/setCustomerNotes";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import Drawer from "@/components/ui/Drawer";

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

// Notes tab. Ported from old routes/Pos/Uploads/customer-uploads.js.
// The Documents side-panel (old CustomerUploadsList) is NOT ported yet — that
// list view has no shadcn equivalent migrated, so the Documents button is
// omitted here and flagged. Notes create/edit/delete is fully preserved.
export default function CustomerUploads() {
  const [filterOptions, setFilterOptions] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState(null);
  const [customerId, setCustomerId] = useState(null);
  const [customersData, setCustomersData] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerDetail, setCustomerDetail] = useState(null);
  const [notesLoading, setNotesLoading] = useState(false);
  const [deletingCurrentNote, setDeletingCurrentNote] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const quoteBodyCustomer = useSelector(
    (state: any) => state?.customer?.selectedCustomer
  );

  useEffect(() => {
    if (quoteBodyCustomer?.id) {
      setSelectedCustomer(quoteBodyCustomer);
      setCustomerId(quoteBodyCustomer.id);
      getCustomerFilters().then((res) => {
        const filters = res?.data?.data?.filters;
        setFilterOptions(filters);
        if (filters?.length) setSelectedFilter(filters[0].queryFieldName);
      });
    } else {
      setCustomerId(null);
      setSelectedCustomer(null);
      setFilterOptions(null);
      fetchAllCustomers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteBodyCustomer]);

  const fetchAllCustomers = async () => {
    try {
      const res = await listCustomers();
      setCustomersData(res?.data?.data?.customers || []);
    } catch (error) {
      toast.error("Error fetching customers.");
    }
  };

  // note/noteSubject/notesHistory only come back reliably from single-customer.
  const fetchCustomerDetail = async (id) => {
    if (!id) {
      setCustomerDetail(null);
      return;
    }
    setNotesLoading(true);
    try {
      const res = await getSingleCustomer(id);
      setCustomerDetail(res?.data?.data?.customer || null);
    } catch (error) {
      setCustomerDetail(null);
      toast.error(error?.message || "Failed to load customer notes");
    } finally {
      setNotesLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerDetail(customerId);
  }, [customerId]);

  const handleSelectCustomer = (value) => {
    // value is a customer id
    const selected = customersData.find((c) => String(c.id) === String(value));
    setSelectedCustomer(selected || null);
    setCustomerId(selected?.id || null);
  };

  const handleSearch = async (value) => {
    if (!value) return;
    try {
      const res = await listCustomers({
        limit: 10,
        searchFieldName: selectedFilter || undefined,
        searchFiledValue: value,
      });
      const found = res?.data?.data?.customers || [];
      if (found.length === 1) {
        setSelectedCustomer(found[0]);
        setCustomerId(found[0].id);
      } else if (found.length === 0) {
        toast.warning("Customer not found in the database.");
      } else {
        setCustomersData(found);
        toast.info("Multiple customers matched — pick one from the dropdown.");
      }
    } catch (error) {
      toast.error("Error searching for customer.");
    }
  };

  const handleSaveNote = async () => {
    if (!customerId) {
      toast.error("Please select a customer before adding a note.");
      return;
    }
    if (!noteDraft.trim()) {
      toast.warning("Please enter a description");
      return;
    }
    try {
      await setCustomerNotes({
        id: customerId,
        noteSubject: customerDetail?.noteSubject || "",
        note: noteDraft,
      });
      toast.success("Note saved successfully");
      setDrawerOpen(false);
      setNoteDraft("");
      fetchCustomerDetail(customerId);
    } catch (error) {
      toast.error(error?.message || "Failed to save note");
    }
  };

  const handleOpenNoteDrawer = () => {
    if (!customerId) {
      toast.error("Please select a customer to add a note.");
      return;
    }
    setNoteDraft(customerDetail?.note || "");
    setDrawerOpen(true);
  };

  const handleDeleteCurrentNote = async () => {
    if (!customerId) return;
    setDeletingCurrentNote(true);
    try {
      await setCustomerNotes({ id: customerId, noteSubject: "", note: "" });
      toast.success("Note deleted successfully");
      fetchCustomerDetail(customerId);
    } catch (error) {
      toast.error(error?.message || "Failed to delete note");
    } finally {
      setDeletingCurrentNote(false);
      setConfirmDeleteOpen(false);
    }
  };

  const hasCurrentNote = Boolean(
    customerDetail?.note || customerDetail?.noteSubject
  );
  const previousNotes = Array.isArray(customerDetail?.notesHistory)
    ? customerDetail.notesHistory.filter(Boolean)
    : [];

  return (
    <div>
      {/* Filters row */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-56">
            <Select
              value={customerId ? String(customerId) : ""}
              onValueChange={handleSelectCustomer}
              disabled={!!quoteBodyCustomer?.id}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Search Customer">
                  {(value) => {
                    const c = customersData.find(
                      (item) => String(item.id) === value
                    );
                    return c ? `${c.firstName} ${c.lastName}` : "Search Customer";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {customersData.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.firstName} {c.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filterOptions && (
            <div className="w-36">
              <Select
                value={selectedFilter ?? ""}
                onValueChange={setSelectedFilter}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {filterOptions.map((o) => (
                    <SelectItem key={o.queryFieldName} value={o.queryFieldName}>
                      {o.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-2">
            <Input
              placeholder="Search ..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch(searchValue)}
              className="w-44"
            />
            <Button variant="outline" onClick={() => handleSearch(searchValue)}>
              Search
            </Button>
          </div>
        </div>

        <Button onClick={handleOpenNoteDrawer}>Add Note</Button>
      </div>

      {/* Notes content */}
      <div className="pb-8">
        {!customerId ? (
          <div className="rounded-xl border border-dashed border-border py-24 text-center text-muted-foreground">
            Select a customer to view their notes
          </div>
        ) : notesLoading ? (
          <div className="py-24 text-center text-muted-foreground">Loading…</div>
        ) : (
          <div className="space-y-5">
            {customerDetail?.shouldWarnUser && (
              <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4">
                <TriangleAlert className="mt-0.5 h-5 w-5 text-amber-600" />
                <div>
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-amber-600">
                    Cashier Warning
                  </div>
                  <div className="whitespace-pre-wrap text-sm text-gray-700">
                    {customerDetail?.warningMessage ||
                      "This customer is flagged for a warning."}
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
                      <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-blue-500">
                        Current Note
                      </div>
                      {customerDetail?.noteSubject && (
                        <div className="mb-1 text-base font-semibold text-gray-800">
                          {customerDetail.noteSubject}
                        </div>
                      )}
                      <div className="whitespace-pre-wrap text-sm text-gray-600">
                        {customerDetail?.note || "-"}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {customerDetail?.updatedAt && (
                      <span className="mr-2 whitespace-nowrap text-xs text-gray-400">
                        {fmtDate(customerDetail.updatedAt)}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleOpenNoteDrawer}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={deletingCurrentNote}
                      onClick={() => setConfirmDeleteOpen(true)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : previousNotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
                <div className="mb-3 text-4xl">📝</div>
                <p className="font-medium text-gray-600">
                  No notes yet for this customer
                </p>
                <p className="mb-3 text-sm text-muted-foreground">
                  Add a note to keep track of important details
                </p>
                <Button variant="outline" onClick={handleOpenNoteDrawer}>
                  Add the first note
                </Button>
              </div>
            ) : null}

            {previousNotes.length > 0 && (
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <History className="h-4 w-4 text-gray-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Previous Notes
                  </span>
                </div>
                <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                  {previousNotes
                    .slice()
                    .reverse()
                    .map((text, displayIdx) => (
                      <div key={displayIdx} className="flex items-start gap-3 p-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-gray-500">
                          {previousNotes.length - displayIdx}
                        </span>
                        <span className="whitespace-pre-wrap text-sm text-gray-600">
                          {text}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit note drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setNoteDraft("");
        }}
        side="right"
        size={500}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-lg font-semibold">
              {hasCurrentNote ? "Edit Note" : "Add Note"}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDrawerOpen(false);
                setNoteDraft("");
              }}
            >
              Close
            </Button>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <Label className="mb-1.5">Description</Label>
            <textarea
              className="w-full min-h-32 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              placeholder="Write your note here…"
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
            <Button
              variant="outline"
              onClick={() => {
                setDrawerOpen(false);
                setNoteDraft("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveNote}>Save Note</Button>
          </div>
        </div>
      </Drawer>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this note?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the current note and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCurrentNote}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
