import { createSlice } from "@reduxjs/toolkit";

const initialState = { miscCharges: [] };

const miscChargesSlice = createSlice({
  name: "miscCharges",
  initialState,
  reducers: {
    addMiscallenousCharges(state, action) {
      state.miscCharges = action.payload;
    },
  },
});

export const { addMiscallenousCharges } = miscChargesSlice.actions;
export default miscChargesSlice.reducer;
