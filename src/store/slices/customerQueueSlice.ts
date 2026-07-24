import { createSlice } from "@reduxjs/toolkit";

const initialState = { customerInQueue: null, customerAheadId: null };

const customerQueueSlice = createSlice({
  name: "customerQueue",
  initialState,
  reducers: {
    addCustomerInQueue(state, action) {
      state.customerInQueue = action.payload;
    },
    addCustomerAhead(state, action) {
      state.customerAheadId = action.payload;
    },
  },
});

export const { addCustomerInQueue, addCustomerAhead } = customerQueueSlice.actions;
export default customerQueueSlice.reducer;
