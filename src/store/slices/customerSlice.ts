import { createSlice } from "@reduxjs/toolkit";

const initialState = { selectedCustomer: null };

const customerSlice = createSlice({
  name: "customer",
  initialState,
  reducers: {
    setSelectedCustomer(state, action) {
      state.selectedCustomer = action.payload;
    },
    resetSelectedCustomer(state) {
      state.selectedCustomer = null;
    },
  },
});

export const { setSelectedCustomer, resetSelectedCustomer } = customerSlice.actions;
export default customerSlice.reducer;
