import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  shopId: null,
  customerId: null,
  customerTypeId: null,
  customerGroupId: null,
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
    },
    // Keeps registerId/drawerId/statusId across a reset — a fresh sale still
    // needs the same register/drawer session that was already selected.
    resetSalesDetail(state) {
      return {
        ...initialState,
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
