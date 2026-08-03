"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { connectChatSocket } from "@/services/chat/inbox";
import {
  addNewMessage,
  addTempMessage,
  getChatSessions,
  markMessageAsFailed,
  replaceOptimisticMessage,
  updateSessionsList,
} from "@/store/slices/chatSlice";

const ChatSocketContext = createContext(null);

export function ChatSocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [socketError, setSocketError] = useState(false);
  const { token, user } = useSelector((state: any) => state.chat);
  const dispatch: any = useDispatch();

  useEffect(() => {
    if (!token || !user?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const socketInstance = connectChatSocket(token);
    setSocket(socketInstance);
    setSocketError(false);

    const updateConnectionState = (connected, error = false, loading = false) => {
      setIsConnected(connected);
      setSocketError(error);
      setIsLoading(loading);
    };

    const eventHandlers = {
      connect: () => updateConnectionState(true, false, false),
      disconnect: () => updateConnectionState(false, false, false),
      connect_error: () => updateConnectionState(false, true, false),
      newMessage: (data) => {
        dispatch(addNewMessage(data.message || data));
      },
      sessionCreated: (sessions) => {
        const newSession = Array.isArray(sessions) ? sessions[0] : sessions;
        if (newSession) dispatch(updateSessionsList(newSession));
      },
      sessionUpdated: (data) => {
        dispatch(updateSessionsList(data));
        dispatch(getChatSessions());
      },
    };

    Object.entries(eventHandlers).forEach(([event, handler]) => socketInstance.on(event, handler));

    return () => {
      Object.entries(eventHandlers).forEach(([event, handler]) => socketInstance.off(event, handler));
      socketInstance.disconnect();
      setSocket(null);
      updateConnectionState(false, false, false);
    };
  }, [token, user?.id, dispatch]);

  const sendMessage = useCallback(
    (sessionId, content, image = null, callback) => {
      if (!socket || !isConnected) {
        callback?.("Socket not connected");
        return;
      }

      const tempId = `temp-${Date.now()}-${Math.random()}`;
      dispatch(
        addTempMessage({
          _id: tempId,
          content,
          sessionId,
          image,
          createdAt: new Date().toISOString(),
          isOptimistic: true,
          adminId: user?.id,
          adminMetaData: { name: user?.name, email: user?.email, avatar: user?.avatarUrl || "" },
        })
      );

      socket.emit(
        "sendMessage",
        { sessionId, content, target: "TEXT", ...(image && { image }) },
        (response) => {
          if (response?.success && response?.message) {
            dispatch(replaceOptimisticMessage({ tempId, realMessage: response.message }));
            callback?.(null, response);
          } else {
            dispatch(markMessageAsFailed({ tempId, sessionId }));
            callback?.(response?.error || "Failed to send message");
          }
        }
      );
    },
    [socket, isConnected, user, dispatch]
  );

  return (
    <ChatSocketContext.Provider value={{ socket, isConnected, socketError, sendMessage, isLoading }}>
      {children}
    </ChatSocketContext.Provider>
  );
}

export function useChatSocket() {
  const context = useContext(ChatSocketContext);
  if (!context) throw new Error("useChatSocket must be used within a ChatSocketProvider");
  return context;
}
