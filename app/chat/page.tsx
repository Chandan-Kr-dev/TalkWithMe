"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useChatStore, ChatData, MessageData } from "@/store/chatStore";
import { getSocket, disconnectSocket } from "@/lib/socketClient";
import Sidebar from "@/components/Sidebar";
import ChatWindow from "@/components/ChatWindow";
import WelcomeScreen from "@/components/WelcomeScreen";
import toast, { Toaster } from "react-hot-toast";
import { Socket } from "socket.io-client";

export default function ChatPage() {
  const router = useRouter();
  const { user, selectedChat, setChats, setOnlineUsers, notifications, setNotifications, _hasHydrated } =
    useChatStore();
  const socketRef = useRef<Socket | null>(null);
  const [isMobileView, setIsMobileView] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const mobileBackTrapRef = useRef(false);
  const selectedChatRef = useRef<ChatData | null>(null);

  // Keep ref in sync
  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  // Redirect if not logged in (only after store has rehydrated from localStorage)
  useEffect(() => {
    if (_hasHydrated && !user) {
      router.push("/");
    }
  }, [user, router, _hasHydrated]);

  // Handle responsive
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Mobile hardware back handling — ensure back shows sidebar instead of exiting the app
  useEffect(() => {
    if (!isMobileView || showSidebar) return;
    if (typeof window === "undefined") return;

    const handlePopState = () => {
      mobileBackTrapRef.current = false;
      setShowSidebar(true);
    };

    mobileBackTrapRef.current = true;
    window.history.pushState({ chatOverlay: true }, "", window.location.href);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      mobileBackTrapRef.current = false;
    };
  }, [isMobileView, showSidebar]);

  const fetchChats = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/chat", {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setChats(data);
        const currentSelectedId = useChatStore.getState().selectedChat?._id;
        if (currentSelectedId) {
          const updatedChat = data.find((chat: ChatData) => chat._id === currentSelectedId);
          if (updatedChat) {
            useChatStore.getState().setSelectedChat(updatedChat);
          }
        }
      }
    } catch (error) {
      console.error("Fetch chats error:", error);
    }
  }, [user, setChats]);

  // Socket setup
  useEffect(() => {
    if (!user) return;

    const socket = getSocket();
    socketRef.current = socket;

    socket.emit("setup", user._id);

    socket.on("online-users", (users: string[]) => {
      setOnlineUsers(users);
    });

    socket.on("message-received", (newMessage: MessageData) => {
      // If not in the chat that received the message, show notification
      if (
        !selectedChatRef.current ||
        selectedChatRef.current._id !== newMessage.chat._id
      ) {
        const existingNotif = notifications.find(
          (n) => n.message._id === newMessage._id
        );
        if (!existingNotif) {
          setNotifications([
            {
              _id: Date.now().toString(),
              user: user._id,
              message: newMessage,
              chat: newMessage.chat,
              isRead: false,
              createdAt: new Date().toISOString(),
            },
            ...notifications,
          ]);
          toast(`New message from ${newMessage.sender.name}`, { icon: "💬" });
        }
      }
      // Refresh chat list
      fetchChats();
    });

    const handleNotificationReceived = (payload: {
      type?: string;
      removerName?: string;
    }) => {
      if (payload?.type === "friend-removed") {
        toast(`${payload.removerName || "A user"} removed you as a friend`, {
          icon: "🚫",
        });
        fetchChats();
      }
    };

    socket.on("notification-received", handleNotificationReceived);

    // Listen for read receipts to refresh sidebar ticks
    socket.on("messages-read", () => {
      fetchChats();
    });

    // Listen for delivery updates to refresh sidebar ticks
    socket.on("message-delivered", () => {
      fetchChats();
    });

    return () => {
      socket.off("online-users");
      socket.off("message-received");
      socket.off("messages-read");
      socket.off("message-delivered");
      socket.off("notification-received", handleNotificationReceived);
      socketRef.current = null;
    };
  }, [user, notifications, setOnlineUsers, setNotifications, fetchChats]);

  // Fetch chats on mount
  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectSocket();
    };
  }, []);

  const handleSelectChat = (chat: ChatData) => {
    useChatStore.getState().setSelectedChat(chat);
    if (isMobileView) setShowSidebar(false);

    // Join room
    socketRef.current?.emit("join-chat", chat._id);

    // Mark notifications as read for this chat
    const updatedNotifications = notifications.filter(
      (n) => n.chat._id !== chat._id
    );
    setNotifications(updatedNotifications);
  };

  const handleMobileBackNavigation = useCallback(() => {
    if (isMobileView && !showSidebar) {
      if (mobileBackTrapRef.current && typeof window !== "undefined") {
        window.history.back();
        return;
      }
    }
    setShowSidebar(true);
  }, [isMobileView, showSidebar]);

  if (!_hasHydrated || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100 dark:bg-gray-950">
        <div className="animate-spin rounded-full h-10 w-10 border-3 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  const shouldShowSidebar = !isMobileView || showSidebar || !selectedChat;
  const shouldShowChatArea = !isMobileView || !shouldShowSidebar;

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-950 overflow-hidden">
      <Toaster position="top-center" />

      {/* Sidebar */}
      {shouldShowSidebar && (
        <Sidebar
          onSelectChat={handleSelectChat}
          onRefreshChats={fetchChats}
        />
      )}

      {/* Chat Area */}
      {shouldShowChatArea && (
        <div className="flex-1 flex flex-col">
          {selectedChat ? (
            <ChatWindow
              socketRef={socketRef}
              onBack={handleMobileBackNavigation}
              isMobile={isMobileView}
              onRefreshChats={fetchChats}
            />
          ) : (
            <WelcomeScreen />
          )}
        </div>
      )}
    </div>
  );
}
