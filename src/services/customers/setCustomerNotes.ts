import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

// Ported from the inline url.put("/customers/set-notes") calls in the old
// customer-uploads notes flow. Handles current-note set/clear (the backend
// archives the previous current note into notesHistory).
// body: { id, noteSubject, note }
export async function setCustomerNotes(body) {
  try {
    const response = await api.put(`/customers/set-notes`, body);
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
