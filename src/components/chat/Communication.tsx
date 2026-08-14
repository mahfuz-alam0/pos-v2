"use client";

import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Send, MessageSquare, Menu, Image as ImageIcon, XCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useChatSocket } from "@/context/chat-socket-context";
import { cn } from "@/lib/utils";
import Conversation from "./Conversation";

function MessagesSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}>
          <Skeleton className={cn("h-12 rounded-2xl", i % 2 === 0 ? "w-2/5 rounded-bl-sm" : "w-1/3 rounded-br-sm")} />
        </div>
      ))}
    </div>
  );
}

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

function readImagesAsDataUrls(files) {
  return Promise.all(
    files.map(
      (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve({ preview: event.target.result, name: file.name });
          reader.onerror = reject;
          reader.readAsDataURL(file);
        })
    )
  );
}

export default function Communication({ selectedUser, loading, onOpenDrawer }) {
  const { messages } = useSelector((state: any) => state.chat);
  const { sendMessage, isConnected } = useChatSocket();

  const sessionId = selectedUser?._id || selectedUser?.session_id;
  const sessionMessages = messages[sessionId] || [];

  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (selectedUser && sessionMessages.length > 0) {
      const el = scrollRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [selectedUser, sessionMessages.length]);

  const addImages = (files) => {
    const oversized = files.filter((f) => f.size > MAX_IMAGE_SIZE).map((f) => f.name);
    const valid = files.filter((f) => f.size <= MAX_IMAGE_SIZE);
    if (oversized.length > 0) {
      alert(`The following files exceed the 10MB limit:\n${oversized.join("\n")}`);
    }
    if (valid.length === 0) return;
    readImagesAsDataUrls(valid).then((images) => setSelectedImages((prev) => [...prev, ...images]));
  };

  const handleImageSelect = (e) => {
    addImages(Array.from(e.target.files));
    e.target.value = "";
  };

  const handlePaste = (e) => {
    const allItems: DataTransferItem[] = Array.from(e.clipboardData?.items || []);
    const items = allItems.filter((item) => item.type.indexOf("image") !== -1);
    if (items.length === 0) return;
    e.preventDefault();
    addImages(items.map((item) => item.getAsFile()).filter(Boolean));
  };

  const removeImage = (index) => setSelectedImages((prev) => prev.filter((_, i) => i !== index));

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitMessage();
    }
  };

  const submitMessage = () => {
    if ((message.trim() === "" && selectedImages.length === 0) || !selectedUser || isSending || !isConnected) return;

    setIsSending(true);
    const imageData =
      selectedImages.length > 0
        ? selectedImages.map((img) => (img.preview.startsWith("data:") ? img.preview.substring(5) : img.preview))
        : null;
    const messageContent = message.trim();

    setMessage("");
    setSelectedImages([]);

    sendMessage(sessionId, messageContent, imageData, () => setIsSending(false));
  };

  if (!selectedUser) {
    return (
      <div className="flex h-full flex-col">
        <button
          type="button"
          className="m-4 mb-0 self-start text-muted-foreground lg:hidden"
          onClick={onOpenDrawer}
          aria-label="Open conversations"
        >
          <Menu className="size-5" />
        </button>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <MessageSquare className="size-20 text-muted-foreground/30" />
          <h2 className="mt-5 mb-2 text-2xl font-medium text-muted-foreground">Select a conversation</h2>
          <p className="text-sm text-muted-foreground/70">Choose from your existing conversations to start messaging</p>
        </div>
      </div>
    );
  }

  const userData = selectedUser?.userMetaData || {};
  const displayName = userData.name || "Unknown User";
  const isActive = !selectedUser?.isClosed;

  return (
    <div className="flex h-full flex-col bg-component-bg">
      <div className="flex h-18 items-center px-4 ring-1 ring-foreground/10 sm:px-6">
        <button type="button" className="mr-4 text-muted-foreground lg:hidden" onClick={onOpenDrawer} aria-label="Open conversations">
          <Menu className="size-5" />
        </button>
        <Avatar>
          <AvatarImage src={userData.avatar} alt={displayName} />
          <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="ml-3">
          <h3 className="text-base font-semibold text-foreground">{displayName}</h3>
          <span className={cn("text-xs", isActive ? "font-medium text-green-600" : "text-muted-foreground")}>
            {isActive ? "Active now" : "Offline"}
          </span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-muted/40">
        <div className="px-4 py-5">
          {loading && sessionMessages.length === 0 ? <MessagesSkeleton /> : <Conversation chats={sessionMessages} />}
        </div>
      </div>

      <div className="px-6 py-4 ring-1 ring-foreground/10">
        {selectedImages.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {selectedImages.map((image, index) => (
              <div key={index} className="group relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.preview} alt={image.name} className="size-20 rounded-lg object-cover ring-1 ring-foreground/10" />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <XCircle className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-3">
          <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" multiple className="hidden" />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!isConnected}
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-all",
              isConnected ? "bg-muted hover:bg-muted/70 active:scale-95" : "cursor-not-allowed bg-muted/50"
            )}
          >
            <ImageIcon className="size-5" />
          </button>

          <Textarea
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            onPaste={handlePaste}
            disabled={!isConnected}
            rows={1}
            className="max-h-32 min-h-11 flex-1 resize-none rounded-3xl border-0 bg-muted px-5 py-2.5 text-sm focus-visible:bg-muted/70"
          />

          <button
            type="button"
            onClick={submitMessage}
            disabled={(!message.trim() && selectedImages.length === 0) || isSending || !isConnected}
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-full text-primary-foreground transition-all",
              (!message.trim() && selectedImages.length === 0) || isSending || !isConnected
                ? "cursor-not-allowed bg-muted text-muted-foreground"
                : "bg-primary hover:bg-primary/90 active:scale-95"
            )}
          >
            <Send className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
