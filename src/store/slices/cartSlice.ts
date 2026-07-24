import { createSlice } from "@reduxjs/toolkit";

function loadCartFromStorage() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("pos_cart_items");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCartToStorage(cart) {
  if (typeof window === "undefined") return;
  localStorage.setItem("pos_cart_items", JSON.stringify(cart));
}

const initialState = { cart: loadCartFromStorage() };

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addToCart(state, action) {
      state.cart = action.payload;
      saveCartToStorage(action.payload);
    },
    resetCartForSale(state) {
      state.cart = [];
      saveCartToStorage([]);
    },
  },
});

export const { addToCart, resetCartForSale } = cartSlice.actions;
export default cartSlice.reducer;
