import { createSlice } from "@reduxjs/toolkit";

function loadSelectedCustomerFromStorage() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("pos_selected_customer");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSelectedCustomerToStorage(customer) {
  if (typeof window === "undefined") return;
  if (customer) localStorage.setItem("pos_selected_customer", JSON.stringify(customer));
  else localStorage.removeItem("pos_selected_customer");
}

const initialState = { selectedCustomer: loadSelectedCustomerFromStorage() };

const customerSlice = createSlice({
  name: "customer",
  initialState,
  reducers: {
    setSelectedCustomer(state, action) {
      state.selectedCustomer = action.payload;
      saveSelectedCustomerToStorage(action.payload);
    },
    resetSelectedCustomer(state) {
      state.selectedCustomer = null;
      saveSelectedCustomerToStorage(null);
    },
  },
});

export const { setSelectedCustomer, resetSelectedCustomer } = customerSlice.actions;
export default customerSlice.reducer;
