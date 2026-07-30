import { createSlice } from "@reduxjs/toolkit";

// Only the customer *link* (not payment/receipt state — that shouldn't
// survive between sessions) is persisted, so it doesn't get lost when the
// slice is reset on a genuine fresh load but a stray in-memory guard fails
// to catch every "return to /pos" case (e.g. a second tab on the same
// route). Mirrors cartSlice's/lineItemsSlice's localStorage pattern.
function loadCustomerLinkFromStorage() {
  if (typeof window === "undefined") {
    return { customerId: null, customerTypeId: null, customerGroupId: null };
  }
  try {
    const raw = localStorage.getItem("pos_customer_link");
    return raw
      ? JSON.parse(raw)
      : { customerId: null, customerTypeId: null, customerGroupId: null };
  } catch {
    return { customerId: null, customerTypeId: null, customerGroupId: null };
  }
}

function saveCustomerLinkToStorage({ customerId, customerTypeId, customerGroupId }) {
  if (typeof window === "undefined") return;
  if (customerId) {
    localStorage.setItem(
      "pos_customer_link",
      JSON.stringify({ customerId, customerTypeId, customerGroupId })
    );
  } else {
    localStorage.removeItem("pos_customer_link");
  }
}

const initialState = {
  shopId: null,
  ...loadCustomerLinkFromStorage(),
  tipGiven: 0,
  lineItems: [],
  miscCharges: [],
  miscDiscount: null,
  registerId: "",
  drawerId: null,
  statusId: "",
  paymentMethod: "",
  cashPaid: 0,
  virtualPaid: 0,
  internalNote: null,
  receiptNote: null,
  changeMethod: "CASH",
  changeAmount: 0,
  storeCreditsUtilized: [],
  userProvidedDate: null,
  userProvidedTwelveHoursTime: null,
  deliveryMethod: "IN_STORE",
  applicableRegularDeals: [],
  couponId: null,
  loyaltyPointsClaimed: 0,
  proxyPin: null,
  bundledLineItems: [],
};

const salesDetailSlice = createSlice({
  name: "salesDetail",
  initialState,
  reducers: {
    updateSalesDetail(state, action) {
      Object.assign(state, action.payload);
      if (
        "customerId" in action.payload ||
        "customerTypeId" in action.payload ||
        "customerGroupId" in action.payload
      ) {
        saveCustomerLinkToStorage(state);
      }
    },
    // Keeps registerId/drawerId/statusId across a reset — a fresh sale still
    // needs the same register/drawer session that was already selected.
    resetSalesDetail(state) {
      saveCustomerLinkToStorage({ customerId: null, customerTypeId: null, customerGroupId: null });
      return {
        ...initialState,
        customerId: null,
        customerTypeId: null,
        customerGroupId: null,
        registerId: state.registerId,
        drawerId: state.drawerId,
        statusId: state.statusId,
      };
    },
    setSalesDetail(state, action) {
      return action.payload;
    },
  },
});

export const { updateSalesDetail, resetSalesDetail, setSalesDetail } =
  salesDetailSlice.actions;
export default salesDetailSlice.reducer;
