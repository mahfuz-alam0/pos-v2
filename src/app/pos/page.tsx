"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  User,
  Monitor,
  IdCard,
  RotateCcw,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Search,
  Trash2,
  X,
  TriangleAlert,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

import {
  resetSalesDetail,
  updateSalesDetail,
} from "@/store/slices/salesDetailSlice";
import {
  getQuoteForSale,
  resetQuoteForSale,
} from "@/store/slices/quoteForSaleSlice";
import { getSaleDetail, resetSaleDetail } from "@/store/slices/saleDataSlice";
import { updateOrderAction } from "@/store/slices/orderActionSlice";
import {
  addLineItemsAction,
  resetAddedLineITems,
} from "@/store/slices/lineItemsSlice";
import { addToCart, resetCartForSale } from "@/store/slices/cartSlice";
import {
  setSelectedCustomer,
  resetSelectedCustomer,
} from "@/store/slices/customerSlice";
import {
  addCustomerAhead,
  addCustomerInQueue,
} from "@/store/slices/customerQueueSlice";

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
import { useShop } from "@/context/shop-context";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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

import TotalCard from "@/components/pos/TotalCard";
import ProductSearch from "@/components/pos/ProductSearch";
import BundledLineItems from "@/components/pos/BundledLineItems";
import Notes from "@/components/pos/Notes";
import ReturnLineItems from "@/components/pos/ReturnLineItems";
import AddReturnedLineItems from "@/components/pos/AddReturnedLineItems";
import RefundLineItems from "@/components/pos/RefundLineItems";
import CustomerPanelPopovers from "@/components/pos/CustomerPanelPopovers";
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

// Module-level (not React state): survives client-side navigation away from
// and back to /pos within the same tab, but resets to false on a real hard
// reload/new tab, since the module re-evaluates from scratch. Used so the
// session-reset below only fires on a genuinely fresh load, not every time
// the user navigates back to this route.
let hasInitializedPosSession = false;

function TabletPosInner() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { shopDetails } = useShop();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // POS runs the register — always light, regardless of the admin panel's
  // dark-mode setting. CSS-variable overrides alone don't stop `dark:`
  // utility classes baked into shared components, so flip the actual
  // data-mode attribute while mounted and restore it on the way out.
  useEffect(() => {
    const root = document.documentElement;
    const previousMode = root.getAttribute("data-mode");
    root.setAttribute("data-mode", "light");
    return () => {
      if (previousMode) root.setAttribute("data-mode", previousMode);
    };
  }, []);

  const [deliverySubType] = useState("");
  const posResetKey = useSelector((state: any) => state?.lineItems?.resetKey || 0);
  const quoteBody = useSelector((state: any) => state?.salesDetail);
  const saleDetail = useSelector((state: any) => state?.saleData) || {};
  const currentAction = useSelector((state: any) => state?.orderAction?.orderAction);
  const selectedCustomer = useSelector(
    (state: any) => state.customer?.selectedCustomer
  );
  const cart = useSelector((state: any) => state?.cart?.cart) || [];
  const customerInQueue = useSelector(
    (state: any) => state?.customerQueue?.customerInQueue
  );
  const getOrderSummary = useSelector((state: any) => state?.quoteForSale?.lineItems);

  const { discountTypes } = useDiscountTypes();

  const [activeTab, setActiveTab] = useState("1");
  const [refreshOrders, setRefreshOrders] = useState(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [queueDrawerVisible, setQueueDrawerVisible] = useState(false);
  const [docManagerOpen, setDocManagerOpen] = useState(false);
  const [isRegisterDrawerOpen, setIsRegisterDrawerOpen] = useState(false);

  // "split" | "left-only" | "right-only"
  const [panelMode, setPanelMode] = useState("split");
  const [fullscreen, setFullscreen] = useState(false);

  // customer overlay + panel state
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [fullSelectedCustomer, setFullSelectedCustomer] = useState(null);
  const [dlManagerOpen, setDlManagerOpen] = useState(false);
  const [scanIdOpen, setScanIdOpen] = useState(false);
  const [scanDlOpen, setScanDlOpen] = useState(false);
  const [dlUploadOnly, setDlUploadOnly] = useState(false);
  const [dlFrontViewOpen, setDlFrontViewOpen] = useState(false);
  const [shopPreferences, setShopPreferences] = useState(null);
  const [anonymous, setAnonymous] = useState(false);

  // product side
  const [notes, setNotes] = useState(false);
  const [addSelected, setAddSelected] = useState(false);
  const [miscallenousType, setMiscallenousType] = useState(null);
  const [returnedLineItems, setReturnedLineItems] = useState([]);

  const [deliveryType, setDeliveryType] = useState(
    (typeof window !== "undefined" && localStorage.getItem("deliveryType")) ||
      "IN_STORE"
  );
  const [selectedRegister, setSelectedRegister] = useState(
    (typeof window !== "undefined" && localStorage.getItem("registerId")) || ""
  );
  const [selectedDrawerId, setSelectedDrawerId] = useState(
    (typeof window !== "undefined" && localStorage.getItem("drawerId")) || null
  );

  const customerQueue = useCustomerQueue(
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("shopId"))
      : null
  );
  const { handleResetPOS } = useResetPOS();

  const hasSale = Object.keys(saleDetail).length > 0;

  const confirmResetPOS = () => setResetDialogOpen(true);
  const doResetPOS = () => {
    handleResetPOS();
    toast.success("POS data has been reset successfully");
    setResetDialogOpen(false);
  };

  const cyclePanelMode = () =>
    setPanelMode((m) =>
      m === "split" ? "left-only" : m === "left-only" ? "right-only" : "split"
    );

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
        (item) => item.isOpen === true
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
          registerId
        );
        const openDrawers = (res.data.drawers || []).filter(
          (item) => item.isOpen === true
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
    if (orderSource !== "ORDER_AHEAD" && !hasInitializedPosSession) {
      dispatch(
        updateSalesDetail({
          customerId: null,
          customerTypeId: null,
          customerGroupId: null,
        })
      );
      dispatch(resetSalesDetail());
      dispatch(resetAddedLineITems());
      dispatch(resetCartForSale());
      dispatch(resetQuoteForSale());
      dispatch(resetSelectedCustomer());
    }
    hasInitializedPosSession = true;

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
    return () =>
      window.removeEventListener("registerDrawerSelected", handler);
  }, []);

  // If the active drawer gets closed from inside RegisterDrawerModal, stop
  // treating the register as ready for checkout instead of leaving the
  // stale drawerId in place (page.tsx state was the only copy the modal
  // couldn't clear directly, since it closed a drawer that may no longer
  // be the one selected here).
  useEffect(() => {
    const handler = (e) => {
      const { drawerId } = e.detail || {};
      setSelectedDrawerId((current) =>
        current && String(current) === String(drawerId) ? null : current
      );
    };
    window.addEventListener("registerDrawerClosed", handler);
    return () => window.removeEventListener("registerDrawerClosed", handler);
  }, []);

  // --- Auto-select default customer group from queued customer ---
  useEffect(() => {
    if (quoteBody.customerId) {
      const customerGroups = JSON.parse(
        localStorage.getItem("customerGroups")
      );
      if (customerGroups && customerGroups.length > 0) {
        const defaultGroup = customerGroups.find(
          (group) => group.id === customerInQueue?.groupIdsToBeZipped?.[0]
        );
        if (defaultGroup) {
          dispatch(updateSalesDetail({ customerGroupId: defaultGroup.id }));
          const updatedQuoteBody = {
            ...quoteBody,
            customerGroupId: defaultGroup.id,
          };
          quoteApiManager
            .call(getQuoteForSales, updatedQuoteBody, "tablet-default-group")
            .then((res) => dispatch(getQuoteForSale(res.data)))
            .catch((error) => toast.error(error?.message || error?.error || "Error"));
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
        })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saleDetail?.id, saleDetail?.customer?.id]);

  // --- Order Ahead handoff: preselect the customer picked on the Order Ahead
  // board, then clear it so it doesn't leak into the next unrelated sale. ---
  const customerAhead = useSelector((state: any) => state?.customerQueue?.customerAheadId);
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
      return;
    }
    dispatch(updateSalesDetail({ customerGroupId: null }));
    setFullSelectedCustomer(null);
    getSingleCustomer(selectedCustomer.id)
      .then((res) => {
        const customer = res?.data?.data?.customer || null;
        setFullSelectedCustomer(customer);
        localStorage.setItem(
          "customerGroups",
          JSON.stringify(customer?.customerGroups || [])
        );
        if (customer?.customerGroups?.length > 0) {
          const defaultGroup =
            customer.customerGroups.find((g) => g.isDefaultForShop) ||
            customer.customerGroups[0];
          dispatch(updateSalesDetail({ customerGroupId: defaultGroup.id }));
        }
      })
      .catch(() => setFullSelectedCustomer(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomer?.id]);

  // --- Select customer (from overlay, or resumed from the queue): quote
  // refresh + default group + auto-queue. queueRecord is the raw queue
  // entry (only passed when resuming from the queue drawer) — its
  // cartMetaDataJsonString is whatever TotalCard's auto-save effect last
  // synced for this customer, and gets restored into the cart here before
  // re-quoting, so putting a customer back to waiting mid-cart and later
  // pulling them back into serving brings their products back too. ---
  const handleSelectCustomer = (customer, queueRecord: any = null) => {
    if (!customer) return;

    dispatch(setSelectedCustomer(customer));
    localStorage.setItem(
      "customerGroups",
      JSON.stringify(customer?.customerGroups || [])
    );

    let defaultCustomerGroupId = null;
    if (customer?.customerGroups?.length > 0) {
      const def = customer.customerGroups.find((g) => g.isDefaultForShop === true);
      defaultCustomerGroupId = def ? def.id : customer.customerGroups[0].id;
    }

    let cartLineItems: any[] = [];
    let cartExtras: any = {};
    if (queueRecord?.cartMetaDataJsonString) {
      try {
        const cartData = JSON.parse(queueRecord.cartMetaDataJsonString);
        cartLineItems = Array.isArray(cartData.lineItems) ? cartData.lineItems : [];
        cartExtras = {
          miscCharges: cartData.miscCharges || [],
          miscDiscount: cartData.miscDiscount || null,
          applicableRegularDeals: cartData.applicableRegularDeals || [],
          applicableBogoDeals: cartData.applicableBogoDeals || [],
          couponId: cartData.couponId || null,
          loyaltyPointsClaimed: cartData.loyaltyPointsClaimed || 0,
          tipGiven: cartData.tipGiven || 0,
        };
      } catch (err) {
        console.error("Failed to parse cart meta data:", err);
      }

      localStorage.setItem("customerInQueueId", JSON.stringify(queueRecord.id));
      dispatch(addCustomerInQueue(queueRecord));

      dispatch(resetAddedLineITems());
      dispatch(resetCartForSale());
      if (cartLineItems.length > 0) {
        dispatch(addLineItemsAction(cartLineItems));
        dispatch(addToCart(cartLineItems));
      }
    }

    dispatch(
      updateSalesDetail({
        customerId: customer?.id,
        customerTypeId: customer?.customerTypeId,
        customerGroupId: defaultCustomerGroupId,
        ...(cartLineItems.length > 0 && { lineItems: cartLineItems }),
        ...cartExtras,
      })
    );

    const updatedQuoteBody = {
      ...quoteBody,
      customerTypeId: customer?.customerTypeId,
      customerId: customer?.id,
      customerGroupId: defaultCustomerGroupId,
      ...(cartLineItems.length > 0 && { lineItems: cartLineItems }),
      ...cartExtras,
    };
    quoteApiManager
      .call(getQuoteForSales, updatedQuoteBody, "tablet-select-customer")
      .then((res) => dispatch(getQuoteForSale(res.data)))
      .catch((error) =>
        toast.error(error?.message || error?.error || "Failed to get quote"),
      );

    // Auto-add customer to queue and immediately move to serving state.
    if (customer?.id) {
      const shopId = JSON.parse(localStorage.getItem("shopId"));
      const currentQueue = customerQueue || [];
      const existingEntry = currentQueue.find((q) => q.customerId === customer.id);
      if (!existingEntry) {
        addCustomerToQueue({ shopId, customerId: customer.id, isAnonymous: false })
          .then(async () => {
            const updatedQueue = await getCustomerQueueList();
            const newEntry = updatedQueue?.find(
              (q) => q.customerId === customer.id
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
            console.error("Failed to auto-add customer to queue:", err)
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
        (q) => q.customerId === customerIdToRemove
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
      })
    );
    localStorage.removeItem("customerGroups");

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
      .call(getQuoteForSales, upd, "tablet-remove-customer")
      .then((res) => dispatch(getQuoteForSale(res.data)))
      .catch(() => {});
  };

  const handleDeliveryTypeChange = (value) => {
    setDeliveryType(value);
    localStorage.setItem("deliveryType", value);
    dispatch(updateSalesDetail({ deliveryMethod: value }));
    const updatedQuoteBody = { ...quoteBody, deliveryMethod: value };
    quoteApiManager
      .call(getQuoteForSales, updatedQuoteBody, "tablet-delivery-method")
      .then((res) => dispatch(getQuoteForSale(res.data)))
      .catch((error) =>
        toast.error(error?.message || error?.error || "Failed to update delivery method"),
      );
  };

  const handleCustomerGroupChange = (value) => {
    const groupId = value === "__none__" ? null : value;
    dispatch(updateSalesDetail({ customerGroupId: groupId }));
    const updatedQuoteBody = { ...quoteBody, customerGroupId: groupId };
    quoteApiManager
      .call(getQuoteForSales, updatedQuoteBody, "tablet-customer-group")
      .then((res) => dispatch(getQuoteForSale(res.data)))
      .catch((error) => toast.error(error?.message || error?.error || "Error"));
  };

  const persistedDeliveryType =
    typeof window !== "undefined" && localStorage.getItem("deliveryType");
  const customerGroups =
    (typeof window !== "undefined" &&
      JSON.parse(localStorage.getItem("customerGroups") || "null")) ||
    [];

  const queueCount = customerQueue?.length || 0;
  const customerName = selectedCustomer
    ? `${selectedCustomer.firstName || ""} ${
        selectedCustomer.lastName || ""
      }`.trim()
    : null;

  const currentNote = selectedCustomer?.note || fullSelectedCustomer?.note;
  const currentNoteSubject =
    selectedCustomer?.noteSubject || fullSelectedCustomer?.noteSubject;
  const previousNotes = Array.isArray(fullSelectedCustomer?.notesHistory)
    ? fullSelectedCustomer.notesHistory.filter(Boolean)
    : [];
  const hasCustomerWarning = Boolean(fullSelectedCustomer?.shouldWarnUser);
  const hasCustomerNotes = Boolean(
    currentNote || currentNoteSubject || previousNotes.length > 0
  );

  const registerReady = selectedRegister && selectedDrawerId;

  const wrapperClass = fullscreen
    ? "fixed inset-0 z-50 flex flex-col overflow-hidden bg-surface"
    : "flex h-full flex-col overflow-hidden bg-surface";

  return (
    <TooltipProvider>
      <div className={wrapperClass}>
        {/* ──── TOP BAR ──── */}
        <div className="flex h-17.5 shrink-0 items-center gap-3 overflow-x-auto border-b border-border bg-gray-100 px-4 shadow-sm">
          {shopDetails?.label && (
            <span className="flex h-8.25 shrink-0 items-center gap-2 rounded-full bg-secondary px-3.25 text-xs font-bold text-white">
              <span className="inline-block h-2 w-2 rounded-full bg-green-600" />
              {shopDetails.label}
            </span>
          )}

          <div className="h-8 w-px shrink-0 bg-gray-200" />

          <Select
            value={deliveryType}
            onValueChange={handleDeliveryTypeChange}
            disabled={hasSale}
          >
            <SelectTrigger className="h-9! w-26.25 shrink-0 bg-white text-xs">
              <SelectValue placeholder="Order Type">
                {(value) => (
                  <span className="flex items-center">
                    {value === "IN_STORE"
                      ? "In Store"
                      : value === "PICK_UP"
                      ? "Pickup"
                      : value === "DELIVERY"
                      ? "Delivery"
                      : "Order Type"}
                    {persistedDeliveryType === value && <GreenDot />}
                  </span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="IN_STORE">
                <span className="flex items-center">
                  In Store
                  {persistedDeliveryType === "IN_STORE" && <GreenDot />}
                </span>
              </SelectItem>
              <SelectItem value="PICK_UP">
                <span className="flex items-center">
                  Pickup
                  {persistedDeliveryType === "PICK_UP" && <GreenDot />}
                </span>
              </SelectItem>
              <SelectItem value="DELIVERY">
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
              onValueChange={handleCustomerGroupChange}
            >
              <SelectTrigger className="h-11 w-40 shrink-0">
                <SelectValue placeholder="Cust. Group">
                  {(value) => {
                    if (value === "__none__" || !value) return "None";
                    const match = customerGroups.find((g) => g.id === value);
                    return match?.name || "Cust. Group";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {customerGroups.map((g) => (
                  <SelectItem key={g.id} value={g.id} title={g.name}>
                    <span className="truncate">{g.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="flex-1 bg-gray-50" />

          <div className="flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  className={`h-14 w-14 shrink-0 ${
                    registerReady
                      ? "border-[#96C790] text-[#96C790]"
                      : ""
                  }`}
                  onClick={() => setIsRegisterDrawerOpen(true)}
                >
                  <Monitor className="size-6" />
                </Button>
              }
            />
            <TooltipContent>Select Register</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  className="h-14 w-14 shrink-0 border-gray-300 bg-white"
                  onClick={() => setDocManagerOpen(true)}
                >
                  <IdCard className="size-6 text-gray-600" />
                </Button>
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
                  onClick={() => setQueueDrawerVisible(true)}
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-md bg-[#3A80F2] text-white">
                    <User className="size-6" />
                  </span>
                  {queueCount > 0 && (
                    <Badge className="absolute -right-2 -top-2 h-5 min-w-5 justify-center rounded-full px-1">
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
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-14 w-14 shrink-0 bg-[#DE4E42] text-white hover:bg-[#E14F43]/90"
                  onClick={confirmResetPOS}
                >
                  <RotateCcw className="size-6 text-white-700" />
                </Button>
              }
            />
            <TooltipContent>Reset POS</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  className="h-14 w-14 shrink-0 border-gray-300 bg-white"
                  onClick={() => setFullscreen((f) => !f)}
                >
                  {fullscreen ? (
                    <Minimize2 className="size-6 text-gray-600"  />
                  ) : (
                    <Maximize2 className="size-6 text-gray-600" />
                  )}
                </Button>
              }
            />
            <TooltipContent>
              {fullscreen ? "Exit fullscreen" : "Fullscreen"}
            </TooltipContent>
          </Tooltip>
          </div>
        </div>

        {/* ──── TAB NAV ──── */}
        <div className="flex h-12 shrink-0 items-center gap-1 overflow-x-auto bg-card px-4">
          {TAB_ITEMS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => switchTab(key)}
              className={`-mb-0.5 whitespace-nowrap border-b-[3px] px-3 py-2 text-sm transition-colors ${
                activeTab === key
                  ? "border-primary  text-primary"
                  : "border-transparent  text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ──── MAIN CONTENT ──── */}
        {activeTab === "1" ? (
          <div className="flex min-h-0 flex-1 overflow-hidden bg-surface pb-3">
            {/* LEFT: Products */}
            <div
              className={`flex h-full min-w-0 flex-col overflow-hidden border border-border transition-all duration-300 ${
                panelMode === "right-only" ? "w-0 flex-[0_0_0px]" : "flex-1"
              }`}
            >
            {/* Customer bar */}
            <div className="flex shrink-0 flex-wrap items-center gap-2 bg-white px-4 py-2">
                {selectedCustomer ? (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 rounded-lg bg-primary px-2.5 py-2 text-primary-foreground">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/20 text-xs font-bold">
                        {selectedCustomer.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={selectedCustomer.avatarUrl}
                            alt=""
                            className="h-6 w-6 object-cover"
                          />
                        ) : (
                          (selectedCustomer.firstName || "?")[0].toUpperCase()
                        )}
                      </span>
                      {hasCustomerWarning || hasCustomerNotes ? (
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <div className="min-w-0">
                                <div className="flex items-center gap-1 text-sm font-semibold leading-tight">
                                  {customerName}
                                  {hasCustomerWarning && (
                                    <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                                  )}
                                  {hasCustomerNotes && (
                                    <FileText className="h-3.5 w-3.5 shrink-0 text-[#4B47C8]" />
                                  )}
                                </div>
                                {selectedCustomer.customerType && (
                                  <div className="text-[11px] leading-tight text-primary-foreground/70">
                                    {selectedCustomer.customerType}
                                  </div>
                                )}
                              </div>
                            }
                          />
                          <TooltipContent className="block max-h-75 w-80 max-w-80 overflow-y-auto rounded-lg bg-white p-3 text-left text-foreground shadow-lg">
                            {hasCustomerWarning && (
                              <div
                                className={`rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 ${
                                  hasCustomerNotes ? "mb-2.5" : ""
                                }`}
                              >
                                <div className="mb-0.5 text-[10px] font-semibold tracking-wide text-amber-700 uppercase">
                                  ⚠ Warning
                                </div>
                                <div className="text-xs whitespace-pre-wrap text-amber-800">
                                  {fullSelectedCustomer?.warningMessage ||
                                    "This customer is flagged for a warning"}
                                </div>
                              </div>
                            )}
                            {(currentNote || currentNoteSubject) && (
                              <div className={previousNotes.length ? "mb-2.5" : ""}>
                                <div className="mb-0.5 text-[10px] font-semibold tracking-wide text-blue-600 uppercase">
                                  Current Note
                                </div>
                                {currentNoteSubject && (
                                  <div className="text-[13px] font-semibold text-gray-800">
                                    {currentNoteSubject}
                                  </div>
                                )}
                                <div className="text-xs whitespace-pre-wrap text-gray-700">
                                  {currentNote}
                                </div>
                              </div>
                            )}
                            {previousNotes.length > 0 && (
                              <div>
                                <div className="mb-1 text-[10px] font-semibold tracking-wide text-gray-500 uppercase">
                                  Previous Notes
                                </div>
                                <div className="flex flex-col gap-1.5">
                                  {previousNotes
                                    .slice()
                                    .reverse()
                                    .map((noteText, idx) => (
                                      <div
                                        key={idx}
                                        className={`text-xs whitespace-pre-wrap text-gray-600 ${
                                          idx < previousNotes.length - 1
                                            ? "border-b border-gray-100 pb-1.5"
                                            : ""
                                        }`}
                                      >
                                        {noteText}
                                      </div>
                                    ))}
                                </div>
                              </div>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <div className="min-w-0">
                          <div className="text-sm font-semibold leading-tight">
                            {customerName}
                          </div>
                          {selectedCustomer.customerType && (
                            <div className="text-[11px] leading-tight text-primary-foreground/70">
                              {selectedCustomer.customerType}
                            </div>
                          )}
                        </div>
                      )}
                      <button
                        type="button"
                        className="ml-1 opacity-70 hover:opacity-100 disabled:opacity-30"
                        disabled={hasSale}
                        onClick={removeSelectedCustomer}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <CustomerPanelPopovers
                      selectedCustomer={selectedCustomer}
                      quoteBody={quoteBody}
                      fullSelectedCustomer={fullSelectedCustomer}
                      onDLIconClick={() => setDlFrontViewOpen(true)}
                      onPlusClick={() => {
                        setDlUploadOnly(true);
                        setDlManagerOpen(true);
                      }}
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={hasSale}
                    onClick={() => setCustomerSearchOpen(true)}
                    className="flex items-center gap-2 rounded-full border-2 border-dashed border-primary/50 bg-primary/5 px-5 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <Search className="h-4 w-4" />
                    Search Customer
                  </button>
                )}

                <div className="flex-1" />

                {!selectedCustomer &&
                  shopPreferences?.shouldAllowAnonymousCustomer && (
                    <label className="mr-1.5 flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                      <Checkbox
                        checked={anonymous}
                        disabled={hasSale}
                        onCheckedChange={(checked) => {
                          setAnonymous(!!checked);
                          if (checked) {
                            dispatch(
                              updateSalesDetail({
                                customerId: null,
                                customerTypeId: null,
                                customerGroupId: null,
                              })
                            );
                            dispatch(setSelectedCustomer(null));
                          }
                        }}
                      />
                      Anonymous
                    </label>
                  )}

                {!selectedCustomer && (
                  <Button
                    disabled={hasSale}
                    onClick={() => setAddCustomerOpen(true)}
                    className="h-9.75! w-15 bg-[#3390DE] hover:bg-[#3390DE]/90"
                  >
                    Add
                  </Button>
                )}

                {selectedCustomer && (
                  <Button
                    disabled={hasSale}
                    onClick={() => setEditingCustomerId(selectedCustomer.id)}
                    className="h-9.75! w-15 bg-[#3390DE] hover:bg-[#3390DE]/90"
                  >
                    Edit
                  </Button>
                )}
              </div>

              {/* Product browsing + line items */}
              <div className="flex-1 overflow-y-auto px-4 pt-4">
                {currentAction === "processReturns" ? (
                  <div className="space-y-3">
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
                  <section className="rounded-lg border border-border p-3">
                    <RefundLineItems cart={cart} discountTypes={discountTypes} />
                  </section>
                ) : (
                  <section>
                    <ProductSearch
                      setAddSelected={setAddSelected}
                      setMiscallenousType={setMiscallenousType}
                      setNotes={setNotes}
                      notes={notes}
                      discountTypes={discountTypes}
                    />
                    {getOrderSummary?.data?.bogoDealUsageTrace?.length > 0 && (
                      <div className="mt-3">
                        <BundledLineItems />
                      </div>
                    )}
                  </section>
                )}
              </div>
            </div>

            {/* COLLAPSE STRIP */}
            <button
              type="button"
              onClick={cyclePanelMode}
              title={
                panelMode === "split"
                  ? "Hide cart"
                  : panelMode === "left-only"
                  ? "Expand cart"
                  : "Show products"
              }
              className="z-10 mx-0.5 flex h-16 w-5 shrink-0 self-center items-center justify-center rounded-xl border border-border bg-card shadow-sm hover:bg-muted"
            >
              {panelMode === "right-only" ? (
                <ChevronLeft className="h-5 w-5" />
              ) : (
                <ChevronRight className="h-5 w-5" />
              )}
            </button>

            {/* RIGHT: Cart & Checkout */}
            <div
              className={`h-full min-w-0 overflow-hidden border border-border transition-all duration-300 ${
                panelMode === "left-only"
                  ? "w-0 flex-[0_0_0px]"
                  : panelMode === "right-only"
                  ? "flex-1"
                  : "flex-[0_0_45%]"
              }`}
            >
              <div className="h-full overflow-y-auto">
                <TotalCard
                  key={posResetKey}
                  deliverySubType={deliverySubType}
                  deliveryType={deliveryType}
                  refreshOrders={refreshOrders}
                  onDraftSaved={confirmResetPOS}
                />
              </div>
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
          open={addCustomerOpen || !!editingCustomerId}
          customerId={editingCustomerId}
          onClose={() => {
            setAddCustomerOpen(false);
            setEditingCustomerId(null);
          }}
          onCreated={(customer, mode) => {
            if (mode === "order" || !mode) handleSelectCustomer(customer);
          }}
          onUpdated={(customer) => {
            if (customer) {
              dispatch(setSelectedCustomer(customer));
              setFullSelectedCustomer(customer);
            }
          }}
        />

        {/* ──── Customer Queue drawer ──── */}
        <Drawer
          open={queueDrawerVisible}
          onClose={() => setQueueDrawerVisible(false)}
          side="right"
          size="60vw"
          zIndex={60}
          className="overflow-auto"
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-lg font-semibold">Customer Queue</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setQueueDrawerVisible(false)}
              >
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
                      if (customer) handleSelectCustomer(customer, record);
                    })
                    .catch(() => {});
                }}
              />
            </div>
          </div>
        </Drawer>

        {/* Notes drawer (triggered from ProductSearch) */}
        <Drawer
          open={notes}
          onClose={() => setNotes(false)}
          side="right"
          size={500}
          zIndex={60}
        >
          <div className="flex h-full flex-col">
            <div className="border-b border-border px-6 py-4 text-base font-semibold">
              Notes
            </div>
            <div className="flex-1 overflow-auto">
              <Notes setNotes={setNotes} />
            </div>
          </div>
        </Drawer>

        {/* DL / Med ID photo manager */}
        <PosDlPhotoManager
          open={dlManagerOpen}
          onClose={() => {
            setDlManagerOpen(false);
            setDlUploadOnly(false);
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
          uploadOnly={dlUploadOnly}
        />

        {/* DL front viewer */}
        <Drawer
          open={dlFrontViewOpen}
          onClose={() => setDlFrontViewOpen(false)}
          side="right"
          size={440}
          zIndex={60}
        >
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
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Yes, Reset
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}

export default function TabletPosPage() {
  return (
    <Suspense fallback={null}>
      <TabletPosInner />
    </Suspense>
  );
}
