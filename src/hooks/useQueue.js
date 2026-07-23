import { useState, useEffect, useRef, useCallback } from "react";
import { getCustomerQueueList } from "@/services/sales/listOfCustomerQueue";
import { connectToSocket } from "@/lib/socket";

function updateLocalStorage(queue) {
  localStorage.setItem("customerQueue", JSON.stringify(queue?.length ?? 0));
}

function filterRemoved(list) {
  return list.filter((c) => !c.isRemoved);
}

export default function useCustomerQueue(shopId) {
  const [customerQueue, setCustomerQueue] = useState([]);
  const socketRef = useRef(null);

  const setQueue = useCallback((queue) => {
    setCustomerQueue(queue);
    updateLocalStorage(queue);
  }, []);

  useEffect(() => {
    const fetchInitialQueue = async () => {
      try {
        const initialQueue = await getCustomerQueueList();
        setQueue(initialQueue);
      } catch (error) {
        console.error("Failed to fetch customer queue:", error);
      }
    };

    socketRef.current = connectToSocket({
      url: `${process.env.NEXT_PUBLIC_BASE_URL}/customer-queue`,
      shopId,
    });

    if (socketRef.current) {
      socketRef.current.on("updateQueue", async (payload) => {
        if (Array.isArray(payload)) {
          setQueue(filterRemoved(payload));
        } else if (payload && Array.isArray(payload.customers)) {
          setQueue(filterRemoved(payload.customers));
        } else {
          setQueue(await getCustomerQueueList());
        }
      });

      socketRef.current.on("customerUpdated", async (updatedCustomer) => {
        if (updatedCustomer?.id) {
          if (updatedCustomer.isRemoved) {
            setCustomerQueue((prev) => {
              const updated = prev.filter((c) => c.id !== updatedCustomer.id);
              updateLocalStorage(updated);
              return updated;
            });
          } else {
            setCustomerQueue((prev) => {
              const updated = prev.map((c) =>
                c.id === updatedCustomer.id ? updatedCustomer : c
              );
              updateLocalStorage(updated);
              return updated;
            });
          }
        } else {
          setQueue(await getCustomerQueueList());
        }
      });

      socketRef.current.on("customersCleared", () => {
        setQueue([]);
      });
    }

    fetchInitialQueue();

    return () => {
      socketRef.current?.disconnect();
    };
  }, [shopId, setQueue]);

  return customerQueue;
}
