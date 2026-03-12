"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useChatStore, MessageData, ChatData } from "@/store/chatStore";
import {
  FiArrowLeft,
  FiSend,
  FiSmile,
  FiMoreVertical,
  FiUsers,
  FiInfo,
  FiPaperclip,
  FiX,
  FiFile,
  FiDownload,
  FiCheck,
} from "react-icons/fi";
import { Socket } from "socket.io-client";
import toast from "react-hot-toast";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import GroupInfoModal from "./GroupInfoModal";
import FriendProfileModal from "./FriendProfileModal";

interface ChatWindowProps {
  socket: Socket | null;
  onBack: () => void;
  isMobile: boolean;
  onRefreshChats: () => void;
}

export default function ChatWindow({ socket, onBack, isMobile, onRefreshChats }: ChatWindowProps) {
  const { user, selectedChat } = useChatStore();
  const theme = useChatStore((s) => s.theme);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showFriendProfile, setShowFriendProfile] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = useCallback(async () => {
    if (!selectedChat || !user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/message?chatId=${selectedChat._id}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const data = await res.json();
      if (res.ok) setMessages(data);
    } catch (error) {
      console.error("Fetch messages error:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedChat, user]);

  // Mark messages as read when chat is opened or new messages arrive
  const markMessagesAsRead = useCallback(async () => {
    if (!selectedChat || !user) return;

    try {
      const res = await fetch("/api/message/read", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ chatId: selectedChat._id }),
      });
      const data = await res.json();
      if (res.ok && data.messageIds?.length > 0) {
        // Update local message statuses
        setMessages((prev) =>
          prev.map((msg) =>
            data.messageIds.includes(msg._id)
              ? { ...msg, status: "read" as const }
              : msg
          )
        );
        // Notify sender(s) via socket — include other user IDs for personal room delivery
        const otherUserIds = selectedChat.users
          .filter((u) => u._id !== user._id)
          .map((u) => u._id);
        socket?.emit("messages-read", {
          chatId: selectedChat._id,
          readerId: user._id,
          messageIds: data.messageIds,
          userIds: otherUserIds,
        });
        // Refresh sidebar to show updated ticks
        onRefreshChats();
      }
    } catch (error) {
      console.error("Mark as read error:", error);
    }
  }, [selectedChat, user, socket, onRefreshChats]);

  // Keep a ref to avoid stale closures in socket listeners
  const markMessagesAsReadRef = useRef(markMessagesAsRead);
  useEffect(() => {
    markMessagesAsReadRef.current = markMessagesAsRead;
  }, [markMessagesAsRead]);
  const onRefreshChatsRef = useRef(onRefreshChats);
  useEffect(() => {
    onRefreshChatsRef.current = onRefreshChats;
  }, [onRefreshChats]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Ensure sender is in the chat room to receive delivery/read updates
  useEffect(() => {
    if (socket && selectedChat) {
      socket.emit("join-chat", selectedChat._id);
    }
  }, [socket, selectedChat]);

  // Mark as read when messages load or chat changes
  useEffect(() => {
    if (messages.length > 0) {
      markMessagesAsRead();
    }
  }, [selectedChat?._id, messages.length > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Socket listeners — use refs for callbacks to keep this effect stable
  useEffect(() => {
    if (!socket) return;

    const handleMessageReceived = (newMsg: MessageData) => {
      if (selectedChat && newMsg.chat._id === selectedChat._id) {
        setMessages((prev) => [...prev, newMsg]);
        // Auto-mark as read since we're in the chat
        markMessagesAsReadRef.current();
      }
    };

    const handleMessageDelivered = (data: { messageId: string; chatId: string }) => {
      // Update our sent message to "delivered"
      setMessages((prev) =>
        prev.map((m) =>
          m._id === data.messageId && (!m.status || m.status === "sent")
            ? { ...m, status: "delivered" as const }
            : m
        )
      );
      onRefreshChatsRef.current();
    };

    const handleMessagesRead = (data: {
      chatId: string;
      readerId: string;
      messageIds: string[];
      userIds?: string[];
    }) => {
      // Mark ALL of our sent messages in this chat as read
      // This avoids ID matching issues and is semantically correct
      if (data.chatId === selectedChat?._id) {
        setMessages((prev) =>
          prev.map((m) => {
            const isOwnMessage = m.sender._id === useChatStore.getState().user?._id;
            if (isOwnMessage && m.status !== "read") {
              return { ...m, status: "read" as const };
            }
            return m;
          })
        );
      }
      onRefreshChatsRef.current();
    };

    const handleTyping = (room: string) => {
      if (room === selectedChat?._id) setIsTyping(true);
    };

    const handleStopTyping = (room: string) => {
      if (room === selectedChat?._id) setIsTyping(false);
    };

    socket.on("message-received", handleMessageReceived);
    socket.on("message-delivered", handleMessageDelivered);
    socket.on("messages-read", handleMessagesRead);
    socket.on("typing", handleTyping);
    socket.on("stop-typing", handleStopTyping);

    return () => {
      socket.off("message-received", handleMessageReceived);
      socket.off("message-delivered", handleMessageDelivered);
      socket.off("messages-read", handleMessagesRead);
      socket.off("typing", handleTyping);
      socket.off("stop-typing", handleStopTyping);
    };
  }, [socket, selectedChat]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !user || !selectedChat) return;

    socket?.emit("stop-typing", selectedChat._id);

    // If there's a file, upload it first
    if (selectedFile) {
      await handleSendFile();
      return;
    }

    try {
      const res = await fetch("/api/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ content: newMessage, chatId: selectedChat._id }),
      });

      const data = await res.json();
      if (res.ok) {
        // Check if any recipients are online — if so, set status to delivered immediately
        const onlineUsers = useChatStore.getState().onlineUsers;
        const recipientOnline = selectedChat.users.some(
          (u) => u._id !== user._id && onlineUsers.includes(u._id)
        );
        const msgWithStatus = { ...data, status: recipientOnline ? "delivered" : "sent" };

        setMessages((prev) => [...prev, msgWithStatus]);
        setNewMessage("");
        setShowEmoji(false);

        // Emit socket event
        socket?.emit("new-message", data);
        onRefreshChats();
      }
    } catch (error) {
      console.error("Send message error:", error);
      toast.error("Failed to send message");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (25MB max)
    if (file.size > 25 * 1024 * 1024) {
      toast.error("File size must be less than 25MB");
      return;
    }

    setSelectedFile(file);

    // Generate preview for images and videos
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => setFilePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else if (file.type.startsWith("video/")) {
      setFilePreview("video");
    } else {
      setFilePreview("document");
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendFile = async () => {
    if (!selectedFile || !user || !selectedChat) return;

    setUploadingFile(true);
    try {
      // Upload file to Cloudinary
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("type", "chat");

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.message);

      // Send message with file
      const res = await fetch("/api/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          content: newMessage || "",
          chatId: selectedChat._id,
          fileUrl: uploadData.url,
          fileType: uploadData.fileType,
          fileName: uploadData.fileName,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        // Check if any recipients are online
        const onlineUsers = useChatStore.getState().onlineUsers;
        const recipientOnline = selectedChat.users.some(
          (u) => u._id !== user._id && onlineUsers.includes(u._id)
        );
        const msgWithStatus = { ...data, status: recipientOnline ? "delivered" : "sent" };

        setMessages((prev) => [...prev, msgWithStatus]);
        setNewMessage("");
        clearSelectedFile();
        setShowEmoji(false);

        socket?.emit("new-message", data);
        onRefreshChats();
      }
    } catch (error) {
      console.error("Send file error:", error);
      toast.error("Failed to send file");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    if (!socket || !selectedChat) return;

    if (!typing) {
      setTyping(true);
      socket.emit("typing", selectedChat._id);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop-typing", selectedChat._id);
      setTyping(false);
    }, 2000);
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage((prev) => prev + emojiData.emoji);
  };

  const getChatName = () => {
    if (!selectedChat) return "";
    if (selectedChat.isGroupChat) return selectedChat.chatName;
    const otherUser = selectedChat.users.find((u) => u._id !== user?._id);
    return otherUser?.name || "Unknown";
  };

  const getChatAvatar = () => {
    if (!selectedChat) return "";
    if (selectedChat.isGroupChat) {
      return selectedChat.groupAvatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${selectedChat.chatName}`;
    }
    const otherUser = selectedChat.users.find((u) => u._id !== user?._id);
    return otherUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=default`;
  };

  const isOtherUserOnline = () => {
    if (!selectedChat || selectedChat.isGroupChat) return false;
    const otherUser = selectedChat.users.find((u) => u._id !== user?._id);
    return otherUser ? useChatStore.getState().onlineUsers.includes(otherUser._id) : false;
  };

  const isSameDay = (d1: string, d2: string) => {
    const date1 = new Date(d1);
    const date2 = new Date(d2);
    return date1.toDateString() === date2.toDateString();
  };

  const formatDateSeparator = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 dark:bg-gray-950">
      {/* Chat Header */}
      <div className="px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3 shadow-sm">
        {isMobile && (
          <button onClick={onBack} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <FiArrowLeft size={22} className="text-gray-600 dark:text-gray-300" />
          </button>
        )}
        <img
          src={getChatAvatar()}
          alt={getChatName()}
          className={`w-10 h-10 rounded-full object-cover ${!selectedChat?.isGroupChat ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}`}
          onClick={() => !selectedChat?.isGroupChat && setShowFriendProfile(true)}
        />
        <div
          className={`flex-1 min-w-0 ${!selectedChat?.isGroupChat ? "cursor-pointer" : ""}`}
          onClick={() => !selectedChat?.isGroupChat && setShowFriendProfile(true)}
        >
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 truncate hover:underline">{getChatName()}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {isTyping ? (
              <span className="text-green-500 font-medium">typing...</span>
            ) : selectedChat?.isGroupChat ? (
              `${selectedChat.users.length} members`
            ) : isOtherUserOnline() ? (
              <span className="text-green-500">online</span>
            ) : (
              "offline"
            )}
          </p>
        </div>
        <div className="flex items-center gap-1 relative">
          {selectedChat?.isGroupChat && (
            <button
              onClick={() => setShowGroupInfo(true)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <FiInfo size={18} className="text-gray-600 dark:text-gray-300" />
            </button>
          )}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <FiMoreVertical size={18} className="text-gray-600 dark:text-gray-300" />
          </button>
          {showMenu && (
            <div className="absolute top-12 right-0 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-1 z-50">
              {selectedChat?.isGroupChat ? (
                <button
                  onClick={() => {
                    setShowGroupInfo(true);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-800 dark:text-gray-200"
                >
                  <FiUsers size={16} /> Group Info
                </button>
              ) : (
                <button
                  onClick={() => {
                    setShowFriendProfile(true);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-800 dark:text-gray-200"
                >
                  <FiInfo size={16} /> View Profile
                </button>
              )}
              <button
                onClick={() => {
                  useChatStore.getState().setSelectedChat(null);
                  setShowMenu(false);
                }}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-red-500"
              >
                Close Chat
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-4 py-3"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='${theme === 'dark' ? '0.08' : '0.05'}'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent" />
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => {
              const isMe = msg.sender._id === user?._id;
              const showDate =
                idx === 0 || !isSameDay(messages[idx - 1].createdAt, msg.createdAt);
              const showAvatar =
                !isMe &&
                (idx === messages.length - 1 ||
                  messages[idx + 1]?.sender._id !== msg.sender._id);

              return (
                <div key={msg._id}>
                  {showDate && (
                    <div className="flex justify-center my-4">
                      <span className="px-3 py-1 bg-white dark:bg-gray-800 rounded-full text-xs text-gray-500 dark:text-gray-400 shadow-sm">
                        {formatDateSeparator(msg.createdAt)}
                      </span>
                    </div>
                  )}
                  <div className={`flex mb-1 ${isMe ? "justify-end" : "justify-start"}`}>
                    {!isMe && showAvatar && (
                      <img
                        src={msg.sender.avatar}
                        alt={msg.sender.name}
                        className="w-7 h-7 rounded-full mr-2 mt-auto"
                      />
                    )}
                    {!isMe && !showAvatar && <div className="w-7 mr-2" />}
                    <div
                      className={`max-w-[85%] sm:max-w-[70%] px-3.5 py-2 rounded-2xl ${
                        isMe
                          ? "bg-purple-500 text-white rounded-br-md"
                          : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-md shadow-sm"
                      }`}
                    >
                      {selectedChat?.isGroupChat && !isMe && (
                        <p className="text-xs font-semibold mb-0.5 text-purple-400">
                          {msg.sender.name}
                        </p>
                      )}
                      {/* File attachment */}
                      {msg.fileUrl && msg.fileType === "image" && (
                        <img
                          src={msg.fileUrl}
                          alt={msg.fileName || "Image"}
                          onClick={() => setLightboxImage(msg.fileUrl!)}
                          className="rounded-lg max-w-full max-h-60 object-cover mb-1 cursor-pointer hover:opacity-90 transition-opacity"
                        />
                      )}
                      {msg.fileUrl && msg.fileType === "video" && (
                        <video
                          src={msg.fileUrl}
                          controls
                          className="rounded-lg max-w-full max-h-60 mb-1"
                        />
                      )}
                      {msg.fileUrl && msg.fileType === "document" && (
                        <a
                          href={msg.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-1 transition-colors ${
                            isMe ? "bg-purple-600 hover:bg-purple-700" : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                          }`}
                        >
                          <FiFile size={20} className={isMe ? "text-white" : "text-purple-500"} />
                          <span className={`text-sm truncate flex-1 ${isMe ? "text-white" : "text-gray-700 dark:text-gray-200"}`}>
                            {msg.fileName || "Document"}
                          </span>
                          <FiDownload size={16} className={isMe ? "text-white/70" : "text-gray-400"} />
                        </a>
                      )}
                      {/* Text content (hide default file placeholder if file is present) */}
                      {msg.content && !(msg.fileUrl && !newMessage && ["📷 Photo", "🎥 Video", "📎 Document"].includes(msg.content)) && (
                        <p className="text-sm leading-relaxed break-all">{msg.content}</p>
                      )}
                      <p
                        className={`text-[10px] mt-1 flex items-center justify-end gap-1 ${
                          isMe ? "text-white/70" : "text-gray-400"
                        }`}
                      >
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {isMe && (
                          <span className="inline-flex items-center ml-0.5">
                            {msg.status === "read" ? (
                              /* Double blue tick */
                              <span className="text-blue-300 flex">
                                <FiCheck size={12} className="-mr-1.5" strokeWidth={3} />
                                <FiCheck size={12} strokeWidth={3} />
                              </span>
                            ) : msg.status === "delivered" ? (
                              /* Double gray tick */
                              <span className="flex">
                                <FiCheck size={12} className="-mr-1.5" strokeWidth={3} />
                                <FiCheck size={12} strokeWidth={3} />
                              </span>
                            ) : (
                              /* Single gray tick */
                              <FiCheck size={12} strokeWidth={3} />
                            )}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            {isTyping && (
              <div className="flex items-center gap-2 mt-2">
                <div className="bg-white dark:bg-gray-800 px-4 py-2.5 rounded-2xl rounded-bl-md shadow-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Emoji Picker */}
      {showEmoji && (
        <div className="px-4 pb-2">
          <EmojiPicker onEmojiClick={onEmojiClick} width="100%" height={300} />
        </div>
      )}

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="px-3 sm:px-4 py-2 sm:py-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        {/* File Preview */}
        {selectedFile && (
          <div className="mb-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center gap-3">
            {filePreview && filePreview !== "video" && filePreview !== "document" ? (
              <img src={filePreview} alt="Preview" className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg object-cover" />
            ) : filePreview === "video" ? (
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-purple-100 flex items-center justify-center">
                <span className="text-2xl">🎥</span>
              </div>
            ) : (
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-blue-100 flex items-center justify-center">
                <FiFile size={24} className="text-blue-500" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{selectedFile.name}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button
              type="button"
              onClick={clearSelectedFile}
              className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <FiX size={18} className="text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowEmoji(!showEmoji)}
            className="p-1.5 sm:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <FiSmile size={22} className={showEmoji ? "text-purple-500" : "text-gray-500 dark:text-gray-400"} />
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 sm:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            disabled={uploadingFile}
          >
            <FiPaperclip size={22} className="text-gray-500 dark:text-gray-400" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,video/mp4,video/webm,video/quicktime,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
            onChange={handleFileSelect}
          />
          <input
            type="text"
            placeholder={selectedFile ? "Add a caption..." : "Type a message..."}
            value={newMessage}
            onChange={handleTyping}
            className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-full text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-300 dark:focus:ring-purple-600 focus:bg-white dark:focus:bg-gray-700 transition-all"
          />
          <button
            type="submit"
            disabled={(!newMessage.trim() && !selectedFile) || uploadingFile}
            className="p-2.5 rounded-full bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-purple-300"
          >
            {uploadingFile ? (
              <div className="w-4.5 h-4.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <FiSend size={18} />
            )}
          </button>
        </div>
      </form>

      {/* Group Info Modal */}
      {showGroupInfo && selectedChat?.isGroupChat && (
        <GroupInfoModal
          chat={selectedChat as ChatData}
          onClose={() => setShowGroupInfo(false)}
          onRefreshChats={onRefreshChats}
        />
      )}

      {/* Friend Profile Modal */}
      {showFriendProfile && selectedChat && !selectedChat.isGroupChat && (() => {
        const friend = selectedChat.users.find((u) => u._id !== user?._id);
        if (!friend) return null;
        return (
          <FriendProfileModal
            friendUser={friend}
            onClose={() => setShowFriendProfile(false)}
          />
        );
      })()}

      {/* Image Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-100 bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <FiX size={24} className="text-white" />
          </button>
          <a
            href={lightboxImage}
            download
            onClick={(e) => e.stopPropagation()}
            className="absolute top-4 left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <FiDownload size={24} className="text-white" />
          </a>
          <img
            src={lightboxImage}
            alt="Preview"
            onClick={(e) => e.stopPropagation()}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
          />
        </div>
      )}
    </div>
  );
}
