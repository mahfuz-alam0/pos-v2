import { createSlice } from "@reduxjs/toolkit";

const initialState = { lineItems: [] };

const quoteForSaleSlice = createSlice({
  name: "quoteForSale",
  initialState,
  reducers: {
    getQuoteForSale(state, action) {
      state.lineItems = action.payload;
    },
    resetQuoteForSale() {
      return initialState;
    },
  },
});

export const { getQuoteForSale, resetQuoteForSale } = quoteForSaleSlice.actions;
export default quoteForSaleSlice.reducer;
