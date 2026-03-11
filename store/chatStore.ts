import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface UserInfo {
  _id: string;
  name: string;
  email: string;
  avatar: string;
  about: string;
  token: string;
}

export interface ChatUser {
  _id: string;
  name: string;
  email: string;
  avatar: string;
  about?: string;
  isOnline?: boolean;
}

export interface ChatData {
  _id: string;
  chatName: string;
  isGroupChat: boolean;
  users: ChatUser[];
  latestMessage?: {
    _id: string;
    content: string;
    sender: { _id: string; name: string; avatar: string };
    createdAt: string;
  };
  groupAdmin?: ChatUser;
  groupAvatar?: string;
  updatedAt: string;
}

export interface MessageData {
  _id: string;
  sender: { _id: string; name: string; avatar: string; email: string };
  content: string;
  chat: ChatData;
  readBy: string[];
  createdAt: string;
}

export interface NotificationData {
  _id: string;
  user: string;
  message: MessageData;
  chat: ChatData;
  isRead: boolean;
  createdAt: string;
}

interface ChatStore {
  user: UserInfo | null;
  selectedChat: ChatData | null;
  chats: ChatData[];
  notifications: NotificationData[];
  onlineUsers: string[];
  _hasHydrated: boolean;
  setUser: (user: UserInfo | null) => void;
  setSelectedChat: (chat: ChatData | null) => void;
  setChats: (chats: ChatData[]) => void;
  setNotifications: (notifications: NotificationData[]) => void;
  setOnlineUsers: (users: string[]) => void;
  setHasHydrated: (v: boolean) => void;
  logout: () => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set) => ({
      user: null,
      selectedChat: null,
      chats: [],
      notifications: [],
      onlineUsers: [],
      _hasHydrated: false,
      setUser: (user) => set({ user }),
      setSelectedChat: (selectedChat) => set({ selectedChat }),
      setChats: (chats) => set({ chats }),
      setHasHydrated: (v) => set({ _hasHydrated: v }),
      setNotifications: (notifications) => set({ notifications }),
      setOnlineUsers: (onlineUsers) => set({ onlineUsers }),
      logout: () => set({ user: null, selectedChat: null, chats: [], notifications: [] }),
    }),
    {
      name: "talkwithme-store",
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
