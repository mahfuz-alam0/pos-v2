"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Monitor, IdCard, RotateCcw, User } from "lucide-react";
import { toast } from "sonner";

import {
  resetSalesDetail,
  updateSalesDetail,
} from "@/store/slices/salesDetailSlice";
import {
  getQuoteForSale,
  resetQuoteForSale,
} from "@/store/slices/quoteForSaleSlice";
import { resetSaleDetail } from "@/store/slices/saleDataSlice";
import { resetAddedLineITems } from "@/store/slices/lineItemsSlice";
import { resetCartForSale } from "@/store/slices/cartSlice";
import {
  setSelectedCustomer,
  resetSelectedCustomer,
} from "@/store/slices/customerSlice";
import { addCustomerAhead } from "@/store/slices/customerQueueSlice";

import { getQuoteForSales } from "@/services/sales/getQuoteforSales";
import { getAllPaginatedRegisterDrawer } from "@/services/registers/getRegisterDrawer";
import { listRegisters } from "@/services/registers/listRegisters";
import { getShopPreference } from "@/services/sales/getShopPreference";
import { getShopPreferences } from "@/services/sales/getShopPreferences";
import { getSingleCustomer } from "@/services/customers/getSingleCustomer";
import { addCustomerToQueue } from "@/services/sales/addCustomerToQueue";
import { getCustomerQueueList } from "@/services/sales/listOfCustomerQueue";
import { updateQueueStatus } from "@/services/sales/updateQueueStatus";
import { quoteApiManager } from "@/utils/quoteApiManager";
import useCustomerQueue from "@/hooks/useQueue";
import useResetPOS from "@/hooks/useResetPOS";
import useDiscountTypes from "@/hooks/useDiscountTypes";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Drawer from "@/components/ui/Drawer";

import ProductList from "@/components/pos/ProductList";
import BundledLineItems from "@/components/pos/BundledLineItems";
import MiscellaneousChargeDrawer from "@/components/pos/MiscellaneousChargeDrawer";
import ReturnLineItems from "@/components/pos/ReturnLineItems";
import AddReturnedLineItems from "@/components/pos/AddReturnedLineItems";
import RefundLineItems from "@/components/pos/RefundLineItems";
import PosDlPhotoManager from "@/components/pos/PosDlPhotoManager";
import ScanIdDialog from "@/components/settings/verify/ScanIdDialog";
import PhotoCheckinDialog from "@/components/settings/verify/PhotoCheckinDialog";
import PosDlCheckinManager from "@/components/pos/PosDlCheckinManager";
import RegisterDrawerModal from "@/components/pos/RegisterDrawerModal";
import InProgressOrders from "@/components/pos/InProgressOrders";
import PosDrafts from "@/components/pos/PosDrafts";
import ReturnsPage from "@/components/pos/ReturnsPage";
import CustomerUploads from "@/components/pos/CustomerUploads";
import CustomerQueue from "@/components/dashboard/CustomerQueue";
import SelectCustomers from "@/components/pos-tablet/SelectCustomers";
import AddCustomerForm from "@/components/customers/AddCustomerForm";
import DeliveryLocationsManager from "@/components/customers/DeliveryLocationsManager";
import TabletModeCartSummary from "@/components/pos-tablet/TabletModeCartSummary";

const GreenDot = () => (
  <span className="ml-2 inline-block h-2 w-2 rounded-full bg-green-600" />
);

const TAB_ITEMS = [
  { key: "1", label: "Process Order" },
  { key: "2", label: "Orders" },
  { key: "3", label: "Returns" },
  { key: "4", label: "Notes" },
  { key: "5", label: "Drafts" },
];

// Tablet Mode POS — a dedicated, tablet-optimized checkout screen under
// Fulfillment. Reuses the exact same session orchestration as the
// desktop-style /pos/tablet page (registers/drawers, customer selection,
// reset, fullscreen, order tabs) but swaps the two main panels for a
// compact layout: the tablet-mode product grid (ProductList's grid view,
// already ported from PosTabletMode) on the left, and a condensed
// attach-customer / cart / discounts / tax / checkout summary
// (TabletModeCartSummary) on the right. The cart table it opens is the
// unmodified ProductsCart, and checkout opens the unmodified TotalCard —
// full functional parity with the desktop POS, just re-laid-out for a tablet.
function TabletModePosInner() {
  const dispatch = useDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [deliverySubType] = useState("");
  const posResetKey = useSelector(
    (state: any) => state?.lineItems?.resetKey || 0,
  );
  const quoteBody = useSelector((state: any) => state?.salesDetail);
  const saleDetail = useSelector((state: any) => state?.saleData) || {};
  const currentAction = useSelector(
    (state: any) => state?.orderAction?.orderAction,
  );
  const selectedCustomer = useSelector(
    (state: any) => state.customer?.selectedCustomer,
  );
  const cart = useSelector((state: any) => state?.cart?.cart) || [];
  const customerInQueue = useSelector(
    (state: any) => state?.customerQueue?.customerInQueue,
  );
  const getOrderSummary = useSelector(
    (state: any) => state?.quoteForSale?.lineItems,
  );

  const { discountTypes } = useDiscountTypes();

  const [activeTab, setActiveTab] = useState("1");
  const [refreshOrders, setRefreshOrders] = useState(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [queueDrawerVisible, setQueueDrawerVisible] = useState(false);
  const [docManagerOpen, setDocManagerOpen] = useState(false);
  const [isRegisterDrawerOpen, setIsRegisterDrawerOpen] = useState(false);

  // customer overlay + panel state
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [fullSelectedCustomer, setFullSelectedCustomer] = useState(null);
  const [customerDeliveryLocations, setCustomerDeliveryLocations] = useState<
    any[]
  >([]);
  const [deliveryDrawerOpen, setDeliveryDrawerOpen] = useState(false);
  const [deliverySummary, setDeliverySummary] = useState<any>(null);
  const [dlManagerOpen, setDlManagerOpen] = useState(false);
  const [scanIdOpen, setScanIdOpen] = useState(false);
  const [scanDlOpen, setScanDlOpen] = useState(false);
  const [dlFrontViewOpen, setDlFrontViewOpen] = useState(false);
  const [shopPreferences, setShopPreferences] = useState(null);
  const [anonymous, setAnonymous] = useState(false);

  // product side
  const [miscallenousType, setMiscallenousType] = useState<
    null | "charge" | "discount"
  >(null);
  const [addSelected, setAddSelected] = useState(false);
  const [returnedLineItems, setReturnedLineItems] = useState([]);

  const [deliveryType, setDeliveryType] = useState(
    (typeof window !== "undefined" && localStorage.getItem("deliveryType")) ||
      "IN_STORE",
  );
  const [selectedRegister, setSelectedRegister] = useState(
    (typeof window !== "undefined" && localStorage.getItem("registerId")) || "",
  );
  const [selectedDrawerId, setSelectedDrawerId] = useState(
    (typeof window !== "undefined" && localStorage.getItem("drawerId")) || null,
  );

  const customerQueue = useCustomerQueue(
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("shopId"))
      : null,
  );
  const { handleResetPOS } = useResetPOS();

  const hasSale = Object.keys(saleDetail).length > 0;

  const confirmResetPOS = () => setResetDialogOpen(true);
  const doResetPOS = () => {
    handleResetPOS();
    toast.success("POS data has been reset successfully");
    setResetDialogOpen(false);
  };

  // --- Tab <-> URL sync. Clears orderId/returnId; resets a loaded sale so it
  //     doesn't linger into the Process Order tab. ---
  const switchTab = (key) => {
    setActiveTab(key);
    const params = new URLSearchParams(searchParams.toString());
    if (params.get("orderId") || params.get("returnId")) {
      dispatch(resetSaleDetail());
    }
    params.delete("orderId");
    params.delete("returnId");
    params.set("tab", key);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  // --- Registers: restore + validate stored register, else clear ---
  const fetchRegisters = async () => {
    try {
      const shopId = JSON.parse(localStorage.getItem("shopId"));
      const response = await listRegisters(shopId);
      const openRegisters = (response.data.data.registers || []).filter(
        (item) => item.isOpen === true,
      );
      const storedRegisterId = localStorage.getItem("registerId");
      const storedRegisterIsValid =
        storedRegisterId &&
        openRegisters.some((r) => String(r.id) === String(storedRegisterId));

      if (storedRegisterIsValid) {
        setSelectedRegister(storedRegisterId);
        dispatch(updateSalesDetail({ registerId: storedRegisterId }));
      } else {
        localStorage.removeItem("registerId");
        setSelectedRegister("");
        dispatch(updateSalesDetail({ registerId: null }));
      }
    } catch (error) {
      console.error("Error fetching default data:", error);
    }
  };

  // --- Drawers: restore + validate stored drawer, else fall back to first open ---
  const handleFetchProduct = (paginationData, registerId) =>
    new Promise(async (resolve, reject) => {
      try {
        const res = await getAllPaginatedRegisterDrawer(
          paginationData.limit,
          paginationData.currentPage,
          registerId,
        );
        const openDrawers = (res.data.drawers || []).filter(
          (item) => item.isOpen === true,
        );
        const storedDrawer = localStorage.getItem("drawerId");
        const validId =
          storedDrawer &&
          openDrawers.some((d) => String(d.id) === String(storedDrawer))
            ? storedDrawer
            : openDrawers.length > 0
              ? openDrawers[0].id
              : null;

        if (validId) {
          localStorage.setItem("drawerId", validId);
          setSelectedDrawerId(validId);
          dispatch(updateSalesDetail({ drawerId: validId }));
        } else {
          localStorage.removeItem("drawerId");
          setSelectedDrawerId(null);
          dispatch(updateSalesDetail({ drawerId: null }));
        }
        resolve({ data: openDrawers, paginationData: res.data.paginationData });
      } catch (error) {
        reject({ error });
      }
    });

  // --- Mount: reset sale session unless resuming an ORDER_AHEAD, restore ids,
  //     fire openRegisterModal when drawer is mandatory but unset, load prefs. ---
  useEffect(() => {
    const storedRegisterId = localStorage.getItem("registerId");
    const storedDrawerId = localStorage.getItem("drawerId");

    fetchRegisters();

    getShopPreferences()
      .then((res) => setShopPreferences(res.data.data.preference))
      .catch(() => {});

    const orderSource = localStorage.getItem("orderSource");
    if (orderSource !== "ORDER_AHEAD") {
      dispatch(
        updateSalesDetail({
          customerId: null,
          customerTypeId: null,
          customerGroupId: null,
        }),
      );
      dispatch(resetSalesDetail());
      dispatch(resetAddedLineITems());
      dispatch(resetCartForSale());
      dispatch(resetQuoteForSale());
    }

    if (storedRegisterId)
      dispatch(updateSalesDetail({ registerId: storedRegisterId }));
    if (storedDrawerId)
      dispatch(updateSalesDetail({ drawerId: storedDrawerId }));

    if (!storedRegisterId || !storedDrawerId) {
      getShopPreference()
        .then((res) => {
          const pref = res?.data?.preference;
          if (pref?.isChoosingDrawerMandatoryForCashSaleOnPhysicalStore) {
            window.dispatchEvent(new CustomEvent("openRegisterModal"));
          }
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    localStorage.setItem("deliveryType", deliveryType);
    dispatch(updateSalesDetail({ deliveryMethod: deliveryType }));
    if (selectedRegister) {
      localStorage.setItem("registerId", selectedRegister);
      dispatch(updateSalesDetail({ registerId: selectedRegister }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryType, selectedRegister]);

  // Register change (incl. first load) -> fetch + auto-select drawer.
  useEffect(() => {
    if (selectedRegister) {
      handleFetchProduct({ limit: 7, currentPage: 1 }, selectedRegister);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRegister]);

  useEffect(() => {
    if (selectedDrawerId) {
      localStorage.setItem("drawerId", selectedDrawerId);
      dispatch(updateSalesDetail({ drawerId: selectedDrawerId }));
    } else {
      localStorage.removeItem("drawerId");
      dispatch(updateSalesDetail({ drawerId: null }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDrawerId]);

  // Sync register/drawer selection made inside RegisterDrawerModal.
  useEffect(() => {
    const handler = (e) => {
      const { registerId, drawerId } = e.detail || {};
      if (registerId) setSelectedRegister(String(registerId));
      if (drawerId) setSelectedDrawerId(String(drawerId));
    };
    window.addEventListener("registerDrawerSelected", handler);
    return () => window.removeEventListener("registerDrawerSelected", handler);
  }, []);

  // If the active drawer gets closed from inside RegisterDrawerModal, stop
  // treating the register as ready for checkout instead of leaving the
  // stale drawerId in place.
  useEffect(() => {
    const handler = (e) => {
      const { drawerId } = e.detail || {};
      setSelectedDrawerId((current) =>
        current && String(current) === String(drawerId) ? null : current,
      );
    };
    window.addEventListener("registerDrawerClosed", handler);
    return () => window.removeEventListener("registerDrawerClosed", handler);
  }, []);

  // --- Auto-select default customer group from queued customer ---
  useEffect(() => {
    if (quoteBody.customerId) {
      const customerGroups = JSON.parse(localStorage.getItem("customerGroups"));
      if (customerGroups && customerGroups.length > 0) {
        const defaultGroup = customerGroups.find(
          (group) => group.id === customerInQueue?.groupIdsToBeZipped?.[0],
        );
        if (defaultGroup) {
          dispatch(updateSalesDetail({ customerGroupId: defaultGroup.id }));
          const updatedQuoteBody = {
            ...quoteBody,
            customerGroupId: defaultGroup.id,
          };
          quoteApiManager
            .call(
              getQuoteForSales,
              updatedQuoteBody,
              "tabletMode-default-group",
            )
            .then((res) => dispatch(getQuoteForSale(res.data)))
            .catch((error) => toast.error(error.error || "Error"));
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteBody.customerId]);

  // --- Resume a loaded sale: mirror its customer into selectedCustomer ---
  useEffect(() => {
    if (saleDetail?.customer?.id) {
      dispatch(
        setSelectedCustomer({
          ...saleDetail.customer,
          customerTypeId: saleDetail?.customerType?.id,
          customerType: saleDetail?.customerType?.name,
          customerGroups: saleDetail?.customerGroup
            ? [saleDetail?.customerGroup]
            : [],
        }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saleDetail?.id, saleDetail?.customer?.id]);

  // --- Order Ahead handoff: preselect the customer picked on the Order Ahead
  // board, then clear it so it doesn't leak into the next unrelated sale. ---
  const customerAhead = useSelector(
    (state: any) => state?.customerQueue?.customerAheadId,
  );
  useEffect(() => {
    if (customerAhead) {
      dispatch(setSelectedCustomer(customerAhead));
      dispatch(addCustomerAhead(null));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerAhead]);

  // --- Full customer fetch on selection (DL image, delivery, groups) ---
  useEffect(() => {
    if (!selectedCustomer?.id) {
      setFullSelectedCustomer(null);
      setCustomerDeliveryLocations([]);
      return;
    }
    dispatch(updateSalesDetail({ customerGroupId: null }));
    setFullSelectedCustomer(null);
    getSingleCustomer(selectedCustomer.id)
      .then((res) => {
        const customer = res?.data?.data?.customer || null;
        setFullSelectedCustomer(customer);
        setCustomerDeliveryLocations(customer?.deliveryLocations || []);
        localStorage.setItem(
          "customerGroups",
          JSON.stringify(customer?.customerGroups || []),
        );
        if (customer?.customerGroups?.length > 0) {
          const defaultGroup =
            customer.customerGroups.find((g) => g.isDefaultForShop) ||
            customer.customerGroups[0];
          dispatch(updateSalesDetail({ customerGroupId: defaultGroup.id }));
        }
      })
      .catch(() => {
        setFullSelectedCustomer(null);
        setCustomerDeliveryLocations([]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomer?.id]);

  // --- Select customer (from overlay): quote refresh + default group + auto-queue ---
  const handleSelectCustomer = (customer) => {
    if (!customer) return;

    dispatch(setSelectedCustomer(customer));
    localStorage.setItem(
      "customerGroups",
      JSON.stringify(customer?.customerGroups || []),
    );

    let defaultCustomerGroupId = null;
    if (customer?.customerGroups?.length > 0) {
      const def = customer.customerGroups.find(
        (g) => g.isDefaultForShop === true,
      );
      defaultCustomerGroupId = def ? def.id : customer.customerGroups[0].id;
    }

    dispatch(
      updateSalesDetail({
        customerId: customer?.id,
        customerTypeId: customer?.customerTypeId,
        customerGroupId: defaultCustomerGroupId,
      }),
    );

    const updatedQuoteBody = {
      ...quoteBody,
      customerTypeId: customer?.customerTypeId,
      customerId: customer?.id,
      customerGroupId: defaultCustomerGroupId,
    };
    quoteApiManager
      .call(getQuoteForSales, updatedQuoteBody, "tabletMode-select-customer")
      .then((res) => dispatch(getQuoteForSale(res.data)))
      .catch((error) => toast.error(error?.error || "Failed to get quote"));

    // Auto-add customer to queue and immediately move to serving state.
    if (customer?.id) {
      const shopId = JSON.parse(localStorage.getItem("shopId"));
      const currentQueue = customerQueue || [];
      const existingEntry = currentQueue.find(
        (q) => q.customerId === customer.id,
      );
      if (!existingEntry) {
        addCustomerToQueue({
          shopId,
          customerId: customer.id,
          isAnonymous: false,
        })
          .then(async () => {
            const updatedQueue = await getCustomerQueueList();
            const newEntry = updatedQueue?.find(
              (q) => q.customerId === customer.id,
            );
            if (newEntry?.id) {
              await updateQueueStatus({
                shopId,
                id: newEntry.id,
                action: "MOVE_TO_SERVING",
              });
            }
          })
          .catch((err) =>
            console.error("Failed to auto-add customer to queue:", err),
          );
      } else if (existingEntry?.id && !existingEntry.isGettingServed) {
        updateQueueStatus({
          shopId,
          id: existingEntry.id,
          action: "MOVE_TO_SERVING",
        }).catch(() => {});
      }
    }
  };

  // --- Remove customer: queue removal + quote reset ---
  const removeSelectedCustomer = async () => {
    quoteApiManager.reset();

    const customerIdToRemove = quoteBody?.customerId || selectedCustomer?.id;
    if (customerIdToRemove) {
      const queueRecord = (customerQueue || []).find(
        (q) => q.customerId === customerIdToRemove,
      );
      if (queueRecord) {
        try {
          const action = customerInQueue
            ? "MOVE_TO_WAITING"
            : queueRecord.isGettingServed
              ? "REMOVE_SERVED"
              : "REMOVE_UNSERVED";
          await updateQueueStatus({
            shopId: JSON.parse(localStorage.getItem("shopId")),
            id: queueRecord.id,
            action,
          });
        } catch (err) {
          console.error("Failed to remove customer from queue:", err);
        }
      }
    }

    dispatch(resetSelectedCustomer());
    dispatch(
      updateSalesDetail({
        customerId: null,
        customerTypeId: null,
        customerGroupId: null,
        loyaltyPointsClaimed: 0,
        couponId: null,
        applicableRegularDeals: [],
        applicableBogoDeals: [],
      }),
    );
    localStorage.removeItem("customerGroups");
    setDeliverySummary(null);
    setCustomerDeliveryLocations([]);

    const upd = {
      ...quoteBody,
      customerId: null,
      customerTypeId: null,
      customerGroupId: null,
      loyaltyPointsClaimed: 0,
      couponId: null,
      applicableRegularDeals: [],
      applicableBogoDeals: [],
    };
    quoteApiManager
      .call(getQuoteForSales, upd, "tabletMode-remove-customer")
      .then((res) => dispatch(getQuoteForSale(res.data)))
      .catch(() => {});
  };

  const handleDeliveryTypeChange = (value) => {
    setDeliveryType(value);
    localStorage.setItem("deliveryType", value);
    dispatch(updateSalesDetail({ deliveryMethod: value }));
    if (value !== "DELIVERY") setDeliverySummary(null);
    const updatedQuoteBody = { ...quoteBody, deliveryMethod: value };
    quoteApiManager
      .call(getQuoteForSales, updatedQuoteBody, "tabletMode-delivery-method")
      .then((res) => dispatch(getQuoteForSale(res.data)))
      .catch((error) =>
        toast.error(error?.message || error?.error || "Failed to update delivery method"),
      );
  };

  // --- Delivery locations saved from the drawer: mirror the first location
  // into the banner summary, and push deliveryAddress/priority/slot onto the
  // quote body so checkout (TotalCard) picks them up via ...quoteBody. ---
  const handleSaveDeliveryLocations = (savedLocations) => {
    const clean = savedLocations.map(
      ({
        _selectedTier,
        _tierName,
        _tierCharge,
        _scheduleForLater,
        _selectedSlot,
        _slotLabel,
        _slotDay,
        _slotFromTime,
        _slotToTime,
        ...rest
      }) => rest,
    );
    setCustomerDeliveryLocations(clean);
    const first = savedLocations[0] || {};

    setDeliverySummary({
      address: first.streetAddress1 || first.tag || "",
      tag: first.tag || "",
      state: first.state || "",
      zipCode: first.zipCode || "",
      tierName: first._tierName || null,
      tierCharge: first._tierCharge || 0,
      slotLabel: first._slotLabel || null,
    });

    const {
      _selectedTier,
      _tierName,
      _tierCharge,
      _scheduleForLater,
      _selectedSlot,
      _slotLabel,
      _slotDay,
      _slotFromTime,
      _slotToTime,
      _key,
      ...deliveryAddress
    } = first;

    dispatch(
      updateSalesDetail({
        deliveryMethod: "DELIVERY",
        deliveryAddress,
        preferredDeliveryPriorityId: _selectedTier || null,
        selectedDeliverySlotLabel: _slotLabel || null,
        deliverySlotDay: _slotDay || null,
        deliverySlotFromTime: _slotFromTime || null,
        deliverySlotToTime: _slotToTime || null,
      }),
    );

    const updatedQuoteBody = {
      ...quoteBody,
      deliveryMethod: "DELIVERY",
      deliveryAddress,
      preferredDeliveryPriorityId: _selectedTier || null,
      selectedDeliverySlotLabel: _slotLabel || null,
      deliverySlotDay: _slotDay || null,
      deliverySlotFromTime: _slotFromTime || null,
      deliverySlotToTime: _slotToTime || null,
    };
    quoteApiManager
      .call(getQuoteForSales, updatedQuoteBody, "tabletMode-deliveryAddress-save")
      .then((res) => dispatch(getQuoteForSale(res.data)))
      .catch((error) =>
        toast.error(error?.message || error?.error || "Failed to update delivery address"),
      );

    setDeliveryDrawerOpen(false);
  };

  const handleCustomerGroupChange = (value) => {
    const groupId = value === "__none__" ? null : value;
    dispatch(updateSalesDetail({ customerGroupId: groupId }));
    const updatedQuoteBody = { ...quoteBody, customerGroupId: groupId };
    quoteApiManager
      .call(getQuoteForSales, updatedQuoteBody, "tabletMode-customer-group")
      .then((res) => dispatch(getQuoteForSale(res.data)))
      .catch((error) => toast.error(error.error || "Error"));
  };

  const persistedDeliveryType =
    typeof window !== "undefined" && localStorage.getItem("deliveryType");
  const customerGroups =
    (typeof window !== "undefined" &&
      JSON.parse(localStorage.getItem("customerGroups") || "null")) ||
    [];

  const queueCount = customerQueue?.length || 0;

  const registerReady = selectedRegister && selectedDrawerId;

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col overflow-hidden bg-surface">
        {/* ──── TAB NAV + TOP BAR (one row) ──── */}
        <div className="flex h-20 shrink-0 items-center gap-3 overflow-x-auto border-b border-blue-400/20 bg-[#071529] px-4 shadow-sm">
          <div className="flex shrink-0 items-center gap-1 rounded-xl bg-white/5 p-1">
            {TAB_ITEMS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => switchTab(key)}
                className={`whitespace-nowrap rounded-full px-3.5 py-2 text-base transition-colors ${
                  activeTab === key
                    ? "border border-blue-400/30 bg-linear-to-r from-blue-500/20 to-cyan-500/20 font-bold text-blue-100 shadow backdrop-blur-sm"
                    : "font-medium text-blue-200/70 hover:bg-white/10 hover:text-white"
                }`}>
                {label}
              </button>
            ))}
          </div>

          <div className="h-8 w-px shrink-0 bg-blue-400/20" />

          <Select
            value={deliveryType}
            onValueChange={handleDeliveryTypeChange}
            disabled={hasSale}>
            <SelectTrigger className="h-11 w-36 shrink-0 rounded-full border border-blue-400/30 bg-linear-to-r from-blue-500/20 to-cyan-500/20 text-base font-medium text-blue-100 backdrop-blur-sm hover:bg-blue-400/10 [&_svg]:text-blue-400">
              <SelectValue placeholder="Order Type">
                {(value) =>
                  value === "IN_STORE"
                    ? "In Store"
                    : value === "PICK_UP"
                      ? "Pickup"
                      : value === "DELIVERY"
                        ? "Delivery"
                        : "Order Type"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="rounded-xl border border-blue-400/30 bg-linear-to-br from-blue-950 to-[#04263f] text-blue-50">
              <SelectItem value="IN_STORE" className="focus:bg-blue-800/60 focus:text-white">
                <span className="flex items-center">
                  In Store
                  {persistedDeliveryType === "IN_STORE" && <GreenDot />}
                </span>
              </SelectItem>
              <SelectItem value="PICK_UP" className="focus:bg-blue-800/60 focus:text-white">
                <span className="flex items-center">
                  Pickup
                  {persistedDeliveryType === "PICK_UP" && <GreenDot />}
                </span>
              </SelectItem>
              <SelectItem value="DELIVERY" className="focus:bg-blue-800/60 focus:text-white">
                <span className="flex items-center">
                  Delivery
                  {persistedDeliveryType === "DELIVERY" && <GreenDot />}
                </span>
              </SelectItem>
            </SelectContent>
          </Select>

          {quoteBody?.customerId && (
            <Select
              value={quoteBody.customerGroupId || "__none__"}
              onValueChange={handleCustomerGroupChange}>
              <SelectTrigger className="h-11 w-44 shrink-0 rounded-full border border-blue-400/30 bg-linear-to-r from-blue-500/20 to-cyan-500/20 text-base font-medium text-blue-100 backdrop-blur-sm hover:bg-blue-400/10 [&_svg]:text-blue-400">
                <SelectValue placeholder="Cust. Group">
                  {(value) => {
                    if (value === "__none__" || !value) return "None";
                    const match = customerGroups.find((g) => g.id === value);
                    return match?.name || "Cust. Group";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-blue-400/30 bg-linear-to-br from-blue-950 to-[#04263f] text-blue-50">
                <SelectItem value="__none__" className="focus:bg-blue-800/60 focus:text-white">
                  None
                </SelectItem>
                {customerGroups.map((g) => (
                  <SelectItem
                    key={g.id}
                    value={g.id}
                    title={g.name}
                    className="focus:bg-blue-800/60 focus:text-white">
                    <span className="truncate">{g.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="flex-1" />

          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border backdrop-blur-sm transition-colors ${
                    registerReady
                      ? "border-green-400/50 bg-green-400/10 text-green-300"
                      : "border-blue-400/30 bg-linear-to-r from-blue-500/20 to-cyan-500/20 text-blue-100 hover:bg-blue-400/10"
                  }`}
                  onClick={() => setIsRegisterDrawerOpen(true)}>
                  <Monitor className="h-5 w-5" />
                </button>
              }
            />
            <TooltipContent>Select Register</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-blue-400/30 bg-linear-to-r from-blue-500/20 to-cyan-500/20 text-blue-100 backdrop-blur-sm transition-colors hover:bg-blue-400/10"
                  onClick={() => setDocManagerOpen(true)}>
                  <IdCard className="h-5 w-5" />
                </button>
              }
            />
            <TooltipContent>Document Manager</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  className="relative shrink-0"
                  onClick={() => setQueueDrawerVisible(true)}>
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border border-blue-400/30 bg-linear-to-r from-blue-500/20 to-cyan-500/20 text-blue-100 backdrop-blur-sm transition-colors hover:bg-blue-400/10">
                    <User className="h-5 w-5" />
                  </span>
                  {queueCount > 0 && (
                    <Badge className="absolute -right-1.5 -top-1.5 h-6 min-w-6 justify-center rounded-full border-2 border-[#071529] px-1.5 text-sm">
                      {queueCount}
                    </Badge>
                  )}
                </button>
              }
            />
            <TooltipContent>{queueCount} in queue</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-red-400/40 bg-red-500/15 text-red-300 backdrop-blur-sm transition-colors hover:bg-red-500/25"
                  onClick={confirmResetPOS}>
                  <RotateCcw className="h-5 w-5" />
                </button>
              }
            />
            <TooltipContent>Reset POS</TooltipContent>
          </Tooltip>
        </div>

        {/* ──── MAIN CONTENT ──── */}
        {activeTab === "1" ? (
          <div className="flex flex-1 gap-2 overflow-hidden  p-3 bg-[#071529]">
            {/* LEFT: Product grid */}
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
              {currentAction === "processReturns" ? (
                <div className="space-y-3 overflow-y-auto px-4 pt-4">
                  <section className="rounded-lg border border-border p-3">
                    <h4 className="mb-2 font-semibold">Current Line Items</h4>
                    <ReturnLineItems
                      returnedLineItems={returnedLineItems}
                      onReturnedLineItemsChange={setReturnedLineItems}
                    />
                  </section>
                  <section className="rounded-lg border border-border p-3">
                    <h4 className="mb-2 font-semibold">Returned Line Items</h4>
                    <AddReturnedLineItems
                      returnedLineItems={returnedLineItems}
                      onReturnedLineItemsChange={setReturnedLineItems}
                    />
                  </section>
                </div>
              ) : currentAction === "processRefunds" ? (
                <div className="overflow-y-auto px-4 pt-4">
                  <section className="rounded-lg border border-border p-3">
                    <RefundLineItems
                      cart={cart}
                      discountTypes={discountTypes}
                    />
                  </section>
                </div>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col ">
                  <ProductList
                    initialView="grid"
                    showFooterActions={false}
                    setAddSelected={setAddSelected}
                    setMiscallenousType={setMiscallenousType}
                    setNotes={undefined}
                    notes={false}
                    discountTypes={discountTypes}
                    autoOpenProduct={null}
                    onClose={undefined}
                  />
                  {getOrderSummary?.data?.bogoDealUsageTrace?.length > 0 && (
                    <div className="mt-3 shrink-0">
                      <BundledLineItems />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* RIGHT: Attach customer / cart / discounts / checkout */}
            <div className="w-95 shrink-0 overflow-hidden xl:w-110">
              <TabletModeCartSummary
                key={posResetKey}
                selectedCustomer={selectedCustomer}
                fullSelectedCustomer={fullSelectedCustomer}
                hasSale={hasSale}
                onAttachCustomer={() => setCustomerSearchOpen(true)}
                onRemoveCustomer={removeSelectedCustomer}
                onAddNewCustomer={() => setAddCustomerOpen(true)}
                onEditCustomer={() =>
                  setEditingCustomer(fullSelectedCustomer || selectedCustomer)
                }
                allowAnonymous={shopPreferences?.shouldAllowAnonymousCustomer}
                anonymous={anonymous}
                onAnonymousChange={(checked) => {
                  setAnonymous(checked);
                  if (checked) {
                    dispatch(
                      updateSalesDetail({
                        customerId: null,
                        customerTypeId: null,
                        customerGroupId: null,
                      }),
                    );
                    dispatch(setSelectedCustomer(null));
                  }
                }}
                deliverySubType={deliverySubType}
                deliveryType={deliveryType}
                customerDeliveryLocations={customerDeliveryLocations}
                deliverySummary={deliverySummary}
                onOpenDeliveryAddress={() => setDeliveryDrawerOpen(true)}
                refreshOrders={refreshOrders}
                onDraftSaved={confirmResetPOS}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto bg-surface p-4">
            {activeTab === "2" && (
              <InProgressOrders
                switchTab={switchTab}
                isActive={activeTab === "2"}
                onRefresh={setRefreshOrders}
              />
            )}
            {activeTab === "3" && <ReturnsPage />}
            {activeTab === "4" && <CustomerUploads />}
            {activeTab === "5" && (
              <PosDrafts isActive={activeTab === "5"} switchTab={switchTab} />
            )}
          </div>
        )}

        {/* ──── Full-screen customer search overlay ──── */}
        <SelectCustomers
          open={customerSearchOpen}
          onClose={() => setCustomerSearchOpen(false)}
          onSelect={handleSelectCustomer}
        />

        <AddCustomerForm
          open={addCustomerOpen || !!editingCustomer}
          customer={editingCustomer}
          onClose={() => {
            setAddCustomerOpen(false);
            setEditingCustomer(null);
          }}
          onCreated={(customer, mode) => {
            if (mode === "order" || !mode) handleSelectCustomer(customer);
          }}
          onUpdated={(updatedCustomer) => {
            dispatch(setSelectedCustomer(updatedCustomer));
            setFullSelectedCustomer(updatedCustomer);
            setEditingCustomer(null);
          }}
        />

        {/* ──── Delivery address drawer ──── */}
        <Drawer
          open={deliveryDrawerOpen}
          onClose={() => setDeliveryDrawerOpen(false)}
          side="right"
          size={620}
          className="overflow-auto">
          <div className="flex h-full flex-col">
            <div className="flex items-center gap-2 border-b border-border px-6 py-4 text-base font-semibold">
              Delivery Address
            </div>
            <div className="flex-1 overflow-auto">
              {deliveryDrawerOpen && (
                <DeliveryLocationsManager
                  customerId={selectedCustomer?.id}
                  initialLocations={customerDeliveryLocations}
                  fallbackAddress={fullSelectedCustomer?.locationDetails}
                  standalone
                  onSave={handleSaveDeliveryLocations}
                />
              )}
            </div>
          </div>
        </Drawer>

        {/* ──── Customer Queue drawer ──── */}
        <Drawer
          open={queueDrawerVisible}
          onClose={() => setQueueDrawerVisible(false)}
          side="right"
          size="60vw"
          zIndex={60}
          className="overflow-auto">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-lg font-semibold">Customer Queue</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setQueueDrawerVisible(false)}>
                Close
              </Button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <CustomerQueue
                sidepanel
                wide
                onCustomerServed={(record) => {
                  setQueueDrawerVisible(false);
                  if (!record?.customerId) return;
                  getSingleCustomer(record.customerId)
                    .then((res) => {
                      const customer = res?.data?.data?.customer;
                      if (customer) handleSelectCustomer(customer);
                    })
                    .catch(() => {});
                }}
              />
            </div>
          </div>
        </Drawer>

        {/* Miscellaneous charge / discount drawer */}
        <Drawer
          open={miscallenousType !== null}
          onClose={() => setMiscallenousType(null)}
          side="right"
          size={600}
          zIndex={60}>
          <div className="flex h-full flex-col">
            <div className="border-b border-border px-6 py-4 text-base font-semibold">
              {miscallenousType === "discount"
                ? "Miscellaneous Discount"
                : "Miscellaneous Charge"}
            </div>
            <div className="flex-1 overflow-auto p-4">
              {miscallenousType !== null && (
                <MiscellaneousChargeDrawer
                  type={miscallenousType === "discount" ? "discount" : "charge"}
                  onDone={() => setMiscallenousType(null)}
                />
              )}
            </div>
          </div>
        </Drawer>

        {/* DL / Med ID photo manager */}
        <PosDlPhotoManager
          open={dlManagerOpen}
          onClose={() => {
            setDlManagerOpen(false);
            if (selectedCustomer?.id) {
              getSingleCustomer(selectedCustomer.id)
                .then((res) => {
                  const fresh = res?.data?.data?.customer || null;
                  setFullSelectedCustomer(fresh);
                  if (fresh) dispatch(setSelectedCustomer(fresh));
                })
                .catch(() => {});
            }
          }}
          onScanDL={() => setScanDlOpen(true)}
          customer={fullSelectedCustomer || selectedCustomer}
          uploadOnly={false}
        />

        {/* DL front viewer */}
        <Drawer
          open={dlFrontViewOpen}
          onClose={() => setDlFrontViewOpen(false)}
          side="right"
          size={440}
          zIndex={60}>
          <div className="flex h-full flex-col">
            <div className="border-b border-border px-6 py-4 text-base font-semibold">
              Front Driver&apos;s License
            </div>
            <div className="flex-1 overflow-auto p-4">
              {fullSelectedCustomer?.drivingLicenseFrontImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={fullSelectedCustomer.drivingLicenseFrontImage}
                  alt="Driver's License"
                  className="w-full rounded-lg"
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  No driver&apos;s license image on file.
                </p>
              )}
            </div>
          </div>
        </Drawer>

        {/* Document Manager */}
        <PosDlCheckinManager
          open={docManagerOpen}
          onClose={() => setDocManagerOpen(false)}
        />

        <ScanIdDialog open={scanIdOpen} onOpenChange={setScanIdOpen} />
        <PhotoCheckinDialog
          open={scanDlOpen}
          onOpenChange={setScanDlOpen}
          mode="dl-back"
        />

        {/* Register / drawer picker */}
        <RegisterDrawerModal
          open={isRegisterDrawerOpen}
          onClose={() => setIsRegisterDrawerOpen(false)}
        />

        {/* Reset confirmation */}
        <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset POS Data</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to reset all POS data? This will clear all
                customers, cart items, line items, and other session data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={doResetPOS}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Yes, Reset
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}

export default function TabletModePosPage() {
  return (
    <Suspense fallback={null}>
      <TabletModePosInner />
    </Suspense>
  );
}
