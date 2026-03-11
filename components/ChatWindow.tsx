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
} from "react-icons/fi";
import { Socket } from "socket.io-client";
import toast from "react-hot-toast";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import GroupInfoModal from "./GroupInfoModal";

interface ChatWindowProps {
  socket: Socket | null;
  onBack: () => void;
  isMobile: boolean;
  onRefreshChats: () => void;
}

export default function ChatWindow({ socket, onBack, isMobile, onRefreshChats }: ChatWindowProps) {
  const { user, selectedChat } = useChatStore();
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const handleMessageReceived = (newMsg: MessageData) => {
      if (selectedChat && newMsg.chat._id === selectedChat._id) {
        setMessages((prev) => [...prev, newMsg]);
      }
    };

    const handleTyping = (room: string) => {
      if (room === selectedChat?._id) setIsTyping(true);
    };

    const handleStopTyping = (room: string) => {
      if (room === selectedChat?._id) setIsTyping(false);
    };

    socket.on("message-received", handleMessageReceived);
    socket.on("typing", handleTyping);
    socket.on("stop-typing", handleStopTyping);

    return () => {
      socket.off("message-received", handleMessageReceived);
      socket.off("typing", handleTyping);
      socket.off("stop-typing", handleStopTyping);
    };
  }, [socket, selectedChat]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !selectedChat) return;

    socket?.emit("stop-typing", selectedChat._id);

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
        setMessages((prev) => [...prev, data]);
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
    <div className="flex-1 flex flex-col h-full bg-gray-50">
      {/* Chat Header */}
      <div className="px-4 py-3 bg-white border-b border-gray-200 flex items-center gap-3 shadow-sm">
        {isMobile && (
          <button onClick={onBack} className="p-1 rounded-full hover:bg-gray-100 transition-colors">
            <FiArrowLeft size={22} className="text-gray-600" />
          </button>
        )}
        <img
          src={getChatAvatar()}
          alt={getChatName()}
          className="w-10 h-10 rounded-full object-cover"
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-800 truncate">{getChatName()}</h3>
          <p className="text-xs text-gray-500">
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
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <FiInfo size={18} className="text-gray-600" />
            </button>
          )}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <FiMoreVertical size={18} className="text-gray-600" />
          </button>
          {showMenu && (
            <div className="absolute top-12 right-0 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
              {selectedChat?.isGroupChat && (
                <button
                  onClick={() => {
                    setShowGroupInfo(true);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <FiUsers size={16} /> Group Info
                </button>
              )}
              <button
                onClick={() => {
                  useChatStore.getState().setSelectedChat(null);
                  setShowMenu(false);
                }}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 text-red-500"
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
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
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
                      <span className="px-3 py-1 bg-white rounded-full text-xs text-gray-500 shadow-sm">
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
                      className={`max-w-[70%] px-3.5 py-2 rounded-2xl ${
                        isMe
                          ? "bg-purple-500 text-white rounded-br-md"
                          : "bg-white text-gray-800 rounded-bl-md shadow-sm"
                      }`}
                    >
                      {selectedChat?.isGroupChat && !isMe && (
                        <p className="text-xs font-semibold mb-0.5 text-purple-400">
                          {msg.sender.name}
                        </p>
                      )}
                      <p className="text-sm leading-relaxed wrap-break-word">{msg.content}</p>
                      <p
                        className={`text-[10px] mt-1 ${
                          isMe ? "text-white/70" : "text-gray-400"
                        } text-right`}
                      >
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            {isTyping && (
              <div className="flex items-center gap-2 mt-2">
                <div className="bg-white px-4 py-2.5 rounded-2xl rounded-bl-md shadow-sm">
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
      <form onSubmit={handleSendMessage} className="px-4 py-3 bg-white border-t border-gray-200">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowEmoji(!showEmoji)}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <FiSmile size={22} className={showEmoji ? "text-purple-500" : "text-gray-500"} />
          </button>
          <input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={handleTyping}
            className="flex-1 px-4 py-2.5 bg-gray-100 rounded-full text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:bg-white transition-all"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="p-2.5 rounded-full bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-purple-300"
          >
            <FiSend size={18} />
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
    </div>
  );
}
