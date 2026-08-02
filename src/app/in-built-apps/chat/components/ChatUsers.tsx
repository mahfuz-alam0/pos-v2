"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Search, Headset } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useShop } from "@/context/shop-context";
import ChatUserList from "./ChatUserList";

export default function ChatUsers({ selectedUser, setSelectedUser }) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("users");
  const { sessions, token, user } = useSelector((state: any) => state.chat);
  const { shopId, shopDetails } = useShop();
  const [filteredUsers, setFilteredUsers] = useState([]);

  useEffect(() => {
    const timerId = setTimeout(() => {
      if (search.trim() === "") {
        setFilteredUsers(sessions);
      } else {
        setFilteredUsers(
          sessions.filter((session) => {
            const userData = session.userMetaData;
            return (
              userData?.name?.toLowerCase().includes(search.toLowerCase()) ||
              userData?.email?.toLowerCase().includes(search.toLowerCase())
            );
          })
        );
      }
    }, 400);
    return () => clearTimeout(timerId);
  }, [search, sessions]);

  const handleTabChange = (key) => {
    if (key === "system") {
      const params = new URLSearchParams();
      if (token) params.append("token", token);
      if (user) {
        params.append(
          "user",
          JSON.stringify({ id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl })
        );
      }
      if (shopId) params.append("shopId", shopId);
      if (shopDetails) params.append("shopDetails", JSON.stringify(shopDetails));
      window.open(`https://support.bleaum.io/connect/chat?${params.toString()}`, "_blank");
      setActiveTab("users");
      return;
    }
    setActiveTab(key);
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-component-bg">
      <div className="flex h-[72px] items-center px-4 ring-1 ring-foreground/10 sm:px-6">
        <h2 className="text-2xl font-semibold text-foreground">Messages</h2>
      </div>

      <div className="flex flex-col gap-3 px-4 py-3 ring-1 ring-foreground/10 sm:px-6">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="w-full">
            <TabsTrigger value="users" className="flex-1 gap-1.5">
              My Users
            </TabsTrigger>
            <TabsTrigger value="system" className="flex-1 gap-1.5">
              <Headset className="size-4" />
              Support
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-xl bg-muted pl-9"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredUsers?.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-16">
            <Search className="size-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">No conversations found</p>
          </div>
        ) : (
          <ChatUserList chatUsers={filteredUsers} selectedUser={selectedUser} onSelectUser={setSelectedUser} />
        )}
      </div>
    </div>
  );
}
