import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { authChat, getChatSessions as fetchChatSessions, getSessionMessages as fetchSessionMessages } from "@/services/chat/inbox";

const initialState = {
  sessions: [],
  messages: {},
  currentSessionId: null,
  loading: false,
  token: "",
  user: null,
  userRole: null,
};

export const chatLogin = createAsyncThunk("chat/initialSetUp", async (props: any, { rejectWithValue, dispatch }) => {
  const { user } = props || {};

  try {
    const storedToken = localStorage.getItem("chatToken");
    const storedUser = localStorage.getItem("user");
    if (storedToken && storedUser) {
      dispatch(getChatSessions());
      return { token: JSON.parse(storedToken), user: JSON.parse(storedUser), userRole: "admin" };
    }
  } catch {
    localStorage.removeItem("chatToken");
  }

  const clientSecret = process.env.NEXT_PUBLIC_CHAT_APP_SECRET;
  if (!clientSecret) return rejectWithValue("Chat is not configured");

  const authResponse = await authChat({
    clientId: process.env.NEXT_PUBLIC_CHAT_CLIENT_ID || "bleaum",
    clientSecret,
    role: "admin",
    externalId: user?.id,
    appId: user?.orgId,
    metadata: { name: user?.name, email: user?.email, avatar: user?.avatarUrl || "" },
  });

  if (authResponse?.error || !authResponse?.token) {
    return rejectWithValue(authResponse?.error || "Authentication failed");
  }

  localStorage.setItem("chatToken", JSON.stringify(authResponse.token));
  dispatch(getChatSessions());
  return { token: authResponse.token, user, userRole: "admin" };
});

export const getChatSessions = createAsyncThunk("chat/getSessions", async () => {
  return fetchChatSessions();
});

export const getSessionMessages = createAsyncThunk("chat/getMessages", async ({ sessionId }: { sessionId: string }) => {
  const messages = await fetchSessionMessages(sessionId);
  return { sessionId, messages };
});

function sortByDate(messages) {
  return [...messages].sort(
    (a, b) => new Date(a.createdAt || a.timestamp || 0).getTime() - new Date(b.createdAt || b.timestamp || 0).getTime()
  );
}

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setCurrentSession(state, action) {
      state.currentSessionId = action.payload;
    },
    addNewMessage(state, action) {
      const message = action.payload;
      const sessionId = message.sessionId;
      if (!sessionId) return;

      if (!state.messages[sessionId]) state.messages[sessionId] = [];

      if (!message.isOptimistic && message._id) {
        state.messages[sessionId] = state.messages[sessionId].filter(
          (msg) =>
            !(
              msg.isOptimistic &&
              msg.content === message.content &&
              Math.abs(new Date(msg.createdAt).getTime() - new Date(message.createdAt).getTime()) < 5000
            )
        );
      }

      const exists = state.messages[sessionId].some((msg) => msg._id === message._id && !msg._id?.startsWith("temp-"));
      if (!exists) {
        state.messages[sessionId] = sortByDate([...state.messages[sessionId], message]);
      }

      const sessionIndex = state.sessions.findIndex((s) => (s._id || s.session_id) === sessionId);
      if (sessionIndex !== -1) {
        state.sessions[sessionIndex].recentMessage = {
          content: message.content,
          sentAt: message.createdAt,
          senderExternalId: message.userId || message.adminId,
        };
        const [session] = state.sessions.splice(sessionIndex, 1);
        state.sessions.unshift(session);
      }
    },
    addTempMessage(state, action) {
      const message = action.payload;
      const sessionId = message.sessionId;
      if (!sessionId) return;
      if (!state.messages[sessionId]) state.messages[sessionId] = [];
      state.messages[sessionId] = sortByDate([...state.messages[sessionId], message]);
    },
    updateSessionsList(state, action) {
      const updatedSession = action.payload;
      const sessionId = updatedSession._id || updatedSession.session_id;
      const index = state.sessions.findIndex((s) => (s._id || s.session_id) === sessionId);
      if (index !== -1) {
        state.sessions[index] = { ...state.sessions[index], ...updatedSession };
      } else {
        state.sessions.unshift(updatedSession);
      }
    },
    replaceOptimisticMessage(state, action) {
      const { tempId, realMessage } = action.payload;
      const sessionId = realMessage.sessionId;
      if (!state.messages[sessionId]) return;
      const tempIndex = state.messages[sessionId].findIndex((msg) => msg._id === tempId);
      if (tempIndex !== -1) state.messages[sessionId][tempIndex] = realMessage;
    },
    markMessageAsFailed(state, action) {
      const { tempId, sessionId } = action.payload;
      if (!state.messages[sessionId]) return;
      const messageIndex = state.messages[sessionId].findIndex((msg) => msg._id === tempId);
      if (messageIndex !== -1) state.messages[sessionId][messageIndex].isFailed = true;
    },
    chatLogout(state) {
      state.token = "";
      state.user = null;
      state.userRole = null;
      state.sessions = [];
      state.messages = {};
      state.currentSessionId = null;
      localStorage.removeItem("chatToken");
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(chatLogin.pending, (state) => {
        state.loading = true;
      })
      .addCase(chatLogin.fulfilled, (state, action) => {
        if (action.payload.token) {
          localStorage.setItem("chatToken", JSON.stringify(action.payload.token));
          state.token = action.payload.token;
          state.user = action.payload.user;
          state.userRole = action.payload.userRole;
        }
        state.loading = false;
      })
      .addCase(chatLogin.rejected, (state) => {
        state.loading = false;
      })
      .addCase(getChatSessions.pending, (state) => {
        state.loading = true;
      })
      .addCase(getChatSessions.fulfilled, (state, action) => {
        state.sessions = action.payload;
        state.loading = false;
      })
      .addCase(getChatSessions.rejected, (state) => {
        state.loading = false;
      })
      .addCase(getSessionMessages.pending, (state) => {
        state.loading = true;
      })
      .addCase(getSessionMessages.fulfilled, (state, action) => {
        const { sessionId, messages } = action.payload;
        state.messages[sessionId] = sortByDate(messages);
        state.loading = false;
      })
      .addCase(getSessionMessages.rejected, (state) => {
        state.loading = false;
      });
  },
});

export const {
  setCurrentSession,
  addNewMessage,
  addTempMessage,
  updateSessionsList,
  replaceOptimisticMessage,
  markMessageAsFailed,
  chatLogout,
} = chatSlice.actions;

export default chatSlice.reducer;
