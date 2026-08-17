"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RotateCw, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Drawer from "@/components/ui/Drawer";
import { useChatSocket } from "@/context/chat-socket-context";
import { getSessionMessages, setCurrentSession } from "@/store/slices/chatSlice";
import ChatUsers from "@/components/chat/ChatUsers";
import Communication from "@/components/chat/Communication";

export default function ChatPage() {
  const { isConnected, socketError, isLoading } = useChatSocket();
  const dispatch: any = useDispatch();

  const [drawerOpen, setDrawerOpen] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 800
  );
  const [selectedUser, setSelectedUser] = useState(null);
  const { messages, loading } = useSelector((state: any) => state.chat);

  useEffect(() => {
    const handleResize = () => {
      const isSmallScreen = window.innerWidth < 800;
      setDrawerOpen(!selectedUser && isSmallScreen ? false : drawerOpen);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [selectedUser, drawerOpen]);

  useEffect(() => {
    if (selectedUser && isConnected) {
      const sessionId = selectedUser._id || selectedUser.session_id;
      dispatch(setCurrentSession(sessionId));
      if (!messages[sessionId] || messages[sessionId].length === 0) {
        dispatch(getSessionMessages({ sessionId }));
      }
    }
  }, [selectedUser, isConnected, dispatch]);

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    if (typeof window !== "undefined" && window.innerWidth < 800) {
      setDrawerOpen(false);
    }
  };

  if (socketError) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <div className="flex flex-col items-center gap-4">
          <h2 className="text-xl font-semibold text-foreground">Connection Error</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Something went wrong with the chat connection. Please try again or report the issue.
          </p>
          <div className="flex gap-2">
            <Button onClick={() => window.location.reload()}>
              <RotateCw className="size-4" />
              Reload Page
            </Button>
            <Button variant="outline" onClick={() => window.open("mailto:support@bleaum.com")}>
              <Mail className="size-4" />
              Report Issue
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Skeleton className="size-10 rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-component-bg">
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} side="left" size={320}>
        <ChatUsers selectedUser={selectedUser} setSelectedUser={handleSelectUser} />
      </Drawer>

      <div className="hidden h-full w-80 shrink-0 ring-1 ring-foreground/10 min-[800px]:flex">
        <ChatUsers selectedUser={selectedUser} setSelectedUser={handleSelectUser} />
      </div>

      <div className="min-w-0 flex-1">
        {loading && !selectedUser ? (
          <div className="flex h-full items-center justify-center">
            <Skeleton className="size-10 rounded-full" />
          </div>
        ) : (
          <Communication selectedUser={selectedUser} loading={loading} onOpenDrawer={() => setDrawerOpen(true)} />
        )}
      </div>
    </div>
  );
}
