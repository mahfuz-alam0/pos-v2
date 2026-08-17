import { io, type Socket } from "socket.io-client";
import { chatApi } from "@/services/chatApi";

const SOCKET_URL = process.env.NEXT_PUBLIC_CHAT_SERVICE_URL;

export interface ChatAuthPayload {
  clientId: string;
  clientSecret: string;
  role: "admin";
  externalId?: string;
  appId?: string;
  metadata: { name?: string; email?: string; avatar?: string };
}

export interface ChatSession {
  _id?: string;
  session_id?: string;
  type?: "BUG_REPORT" | string;
  title?: string;
  isClosed?: boolean;
  updatedAt?: string;
  userMetaData?: { name?: string; email?: string; avatar?: string };
  recentMessage?: { content?: string; sentAt?: string; senderExternalId?: string };
}

export interface ChatMessage {
  _id?: string;
  sessionId: string;
  appId?: string;
  tenantId?: string;
  content?: string;
  message?: string;
  image?: string[] | null;
  images?: string[];
  target?: "TEXT" | string;
  targetLinkRefSubject?: string | null;
  sessionType?: "SUPPORT" | string;
  createdAt?: string;
  updatedAt?: string;
  timestamp?: string;
  status?: "read" | "sent";
  adminId?: string;
  userId?: string;
  isOptimistic?: boolean;
  isFailed?: boolean;
  adminMetaData?: { name?: string; email?: string; avatar?: string };
  userMetaData?: { name?: string; email?: string; avatar?: string };
  __v?: number;
}

export interface SendMessageResponse {
  success: boolean;
  message?: ChatMessage;
  error?: string;
}

export async function authChat(credentials: ChatAuthPayload) {
  try {
    const { data } = await chatApi.post("/auth/token", credentials);
    if (!data.token) throw new Error(data.message || "Authentication failed");
    return { token: data.token as string };
  } catch (err) {
    const error = err as { response?: { data?: { message?: string } }; message?: string };
    return { error: error.response?.data?.message || error.message || "Authentication failed" };
  }
}

export async function getChatSessions(): Promise<ChatSession[]> {
  try {
    const { data } = await chatApi.get("/chat/sessions");
    return data;
  } catch {
    return [];
  }
}

export async function getSessionMessages(sessionId: string, limit = 50): Promise<ChatMessage[]> {
  try {
    const { data } = await chatApi.get(`/chat/sessions/${sessionId}/messages`, { params: { limit } });
    return Array.isArray(data) ? data : data.messages || [];
  } catch {
    return [];
  }
}

export function connectChatSocket(token: string): Socket {
  return io(`${SOCKET_URL}/chat`, {
    auth: { token },
    transports: ["websocket", "polling"],
  });
}
