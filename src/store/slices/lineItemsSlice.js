import { createSlice } from "@reduxjs/toolkit";

function loadLineItemsFromStorage() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("pos_line_items");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLineItemsToStorage(lineItems) {
  if (typeof window === "undefined") return;
  localStorage.setItem("pos_line_items", JSON.stringify(lineItems));
}

const initialState = {
  lineItems: loadLineItemsFromStorage(),
  resetKey: 0,
};

const lineItemsSlice = createSlice({
  name: "lineItems",
  initialState,
  reducers: {
    addLineItemsAction(state, action) {
      state.lineItems = action.payload;
      saveLineItemsToStorage(action.payload);
    },
    // resetKey increments so components keyed on it (e.g. TotalCard, ProductSearch)
    // force-remount and drop their own internal state on a POS reset.
    resetAddedLineITems(state) {
      state.lineItems = [];
      state.resetKey += 1;
      saveLineItemsToStorage([]);
    },
  },
});

export const { addLineItemsAction, resetAddedLineITems } = lineItemsSlice.actions;
export default lineItemsSlice.reducer;
