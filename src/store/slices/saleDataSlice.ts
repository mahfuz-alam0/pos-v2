import { createSlice } from "@reduxjs/toolkit";

const initialState = {};

const saleDataSlice = createSlice({
  name: "saleData",
  initialState,
  reducers: {
    getSaleDetail(state, action) {
      Object.assign(state, action.payload);
    },
    resetSaleDetail() {
      return initialState;
    },
  },
});

export const { getSaleDetail, resetSaleDetail } = saleDataSlice.actions;
export default saleDataSlice.reducer;
