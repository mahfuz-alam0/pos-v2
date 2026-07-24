import { createSlice } from "@reduxjs/toolkit";

const initialState = { cart: [], bogoDeals: [] };

const bogoLineItemsSlice = createSlice({
  name: "bogoLineItems",
  initialState,
  reducers: {
    addBogoItemAction(state, action) {
      const {
        lineItems,
        dealName,
        dealId,
        bundledLineItems,
        bogoType,
        discountRate,
      } = action.payload;
      state.cart = lineItems;
      state.bogoDeals.push({
        dealId,
        dealName,
        bogoType,
        discountRate,
        bundledLineItems,
        addedAt: new Date().toISOString(),
      });
    },
    resetBogoLineItems(state) {
      state.cart = [];
      state.bogoDeals = [];
    },
  },
});

export const { addBogoItemAction, resetBogoLineItems } = bogoLineItemsSlice.actions;
export default bogoLineItemsSlice.reducer;
