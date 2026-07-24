import { createSlice } from "@reduxjs/toolkit";

const initialState = { orderAction: null };

const orderActionSlice = createSlice({
  name: "orderAction",
  initialState,
  reducers: {
    updateOrderAction(state, action) {
      state.orderAction = action.payload;
    },
  },
});

export const { updateOrderAction } = orderActionSlice.actions;
export default orderActionSlice.reducer;
