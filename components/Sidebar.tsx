"use client";

import { useState, useEffect, useCallback } from "react";
import { useChatStore, ChatData, ChatUser } from "@/store/chatStore";
import { useRouter } from "next/navigation";
import {
  FiSearch,
  FiUserPlus,
  FiLogOut,
  FiBell,
  FiX,
  FiUsers,
  FiEdit2,
  FiSun,
  FiMoon,
  FiSettings,
  FiCheck,
  FiClock,
} from "react-icons/fi";
import toast from "react-hot-toast";
import GroupChatModal from "./GroupChatModal";
import ProfileModal from "./ProfileModal";
import SettingsModal from "./SettingsModal";

interface SidebarProps {
  onSelectChat: (chat: ChatData) => void;
  onRefreshChats: () => void;
}

type RelationshipStatus = "friends" | "incoming" | "outgoing" | "none";

interface SearchResult extends ChatUser {
  relationshipStatus: RelationshipStatus;
}

interface FriendSummaryState {
  incoming: ChatUser[];
  outgoing: ChatUser[];
}

export default function Sidebar({ onSelectChat, onRefreshChats }: SidebarProps) {
  const { user, chats, selectedChat, notifications, onlineUsers, logout, theme, toggleTheme } = useChatStore();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [friendSummary, setFriendSummary] = useState<FriendSummaryState>({ incoming: [], outgoing: [] });

  const fetchFriendSummary = useCallback(async () => {
    if (!user?.token) {
      setFriendSummary({ incoming: [], outgoing: [] });
      return;
    }
    try {
      const res = await fetch("/api/friends", {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setFriendSummary({
          incoming: data.incomingRequests || [],
          outgoing: data.outgoingRequests || [],
        });
      }
    } catch (error) {
      console.error("Friend summary error:", error);
    }
  }, [user?.token]);

  useEffect(() => {
    fetchFriendSummary();
  }, [fetchFriendSummary]);

  useEffect(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const query = encodeURIComponent(normalized);
        const res = await fetch(`/api/user?username=${query}`, {
          headers: { Authorization: `Bearer ${user?.token}` },
        });
        const data = await res.json();
        if (res.ok) {
          setSearchResults(Array.isArray(data) ? data : []);
        } else {
          console.error("User search failed:", data.message);
          toast.error(data.message || "Search failed");
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setSearchLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [search, user?.token]);

  const updateSearchRelationship = (userId: string, nextStatus: RelationshipStatus) => {
    setSearchResults((prev) => prev.map((item) => (item._id === userId ? { ...item, relationshipStatus: nextStatus } : item)));
  };

  const handleSendFriendRequest = async (targetUsername: string, targetId: string) => {
    if (!user?.token) return;
    try {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ username: targetUsername }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Friend request sent");
        updateSearchRelationship(targetId, "outgoing");
        if (data.incomingRequests || data.outgoingRequests) {
          setFriendSummary({
            incoming: data.incomingRequests || [],
            outgoing: data.outgoingRequests || [],
          });
        } else {
          fetchFriendSummary();
        }
      } else {
        toast.error(data.message || "Failed to send request");
      }
    } catch (error) {
      console.error("Send friend request error:", error);
      toast.error("Failed to send request");
    }
  };

  const handleRespondFriendRequest = async (requesterId: string, action: "accept" | "decline") => {
    if (!user?.token) return;
    try {
      const res = await fetch("/api/friends", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ requesterId, action }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || (action === "accept" ? "Friend request accepted" : "Friend request declined"));
        if (data.incomingRequests || data.outgoingRequests) {
          setFriendSummary({
            incoming: data.incomingRequests || [],
            outgoing: data.outgoingRequests || [],
          });
        } else {
          fetchFriendSummary();
        }
        updateSearchRelationship(requesterId, action === "accept" ? "friends" : "none");
        if (action === "accept") {
          onRefreshChats();
        }
      } else {
        toast.error(data.message || "Failed to update request");
      }
    } catch (error) {
      console.error("Respond friend request error:", error);
      toast.error("Failed to update request");
    }
  };

  const handleAccessChat = async (userId: string) => {
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (res.ok) {
        onSelectChat(data);
        onRefreshChats();
        setSearch("");
        setSearchResults([]);
      } else {
        toast.error(data.message || "Unable to open chat");
      }
    } catch (error) {
      console.error("Access chat error:", error);
      toast.error("Failed to access chat");
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/");
    toast.success("Logged out");
  };

  const getSenderName = (chat: ChatData) => {
    if (chat.isGroupChat) return chat.chatName;
    const otherUser = chat.users.find((u) => u._id !== user?._id);
    return otherUser?.name || "Unknown";
  };

  const getSenderAvatar = (chat: ChatData) => {
    if (chat.isGroupChat) {
      return chat.groupAvatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${chat.chatName}`;
    }
    const otherUser = chat.users.find((u) => u._id !== user?._id);
    return otherUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=default`;
  };

  const isUserOnline = (chat: ChatData) => {
    if (chat.isGroupChat) return false;
    const otherUser = chat.users.find((u) => u._id !== user?._id);
    return otherUser ? onlineUsers.includes(otherUser._id) : false;
  };

  const getChatNotificationCount = (chatId: string) => {
    return notifications.filter((n) => n.chat._id === chatId).length;
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const totalAlerts = notifications.length + friendSummary.incoming.length;

  return (
    <>
      <div className="w-full md:w-95 bg-[#fff4f4] dark:bg-[#0f0607] border-r border-red-100/60 dark:border-red-900/40 flex flex-col h-full">
        {/* Header */}
        <div className="px-4 py-3 bg-[#fff0f0] dark:bg-[#140808] border-b border-red-100 dark:border-red-900/40">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowProfile(true)}
                className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-red-200 hover:ring-purple-400 transition-all"
              >
                <img
                  src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=default`}
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              </button>
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Chats</h2>
            </div>
            <div className="flex items-center gap-0.5 sm:gap-1">
              {/* Notifications */}
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title={theme === 'light' ? 'Dark mode' : 'Light mode'}
              >
                {theme === 'light' ? (
                  <FiMoon size={20} className="text-gray-600 dark:text-gray-300" />
                ) : (
                  <FiSun size={20} className="text-gray-600 dark:text-gray-300" />
                )}
              </button>
              {/* Settings */}
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Settings"
              >
                <FiSettings size={20} className="text-gray-600 dark:text-gray-300" />
              </button>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <FiBell size={20} className="text-gray-600 dark:text-gray-300" />
                {totalAlerts > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {totalAlerts}
                  </span>
                )}
              </button>
              {/* New Group */}
              <button
                onClick={() => setShowGroupModal(true)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="New Group Chat"
              >
                <FiUsers size={20} className="text-gray-600 dark:text-gray-300" />
              </button>
              {/* Logout */}
              <button
                onClick={handleLogout}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Logout"
              >
                <FiLogOut size={20} className="text-gray-600 dark:text-gray-300" />
              </button>
            </div>
          </div>

          {/* Search */}
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-red-400 dark:text-red-500" size={16} />
              <input
                type="text"
                placeholder="Search by username..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-[#ffe5e5] dark:bg-[#1b0a0b] rounded-xl text-sm text-red-900 dark:text-red-100 placeholder-red-400/70 dark:placeholder-red-200/40 focus:outline-none focus:ring-2 focus:ring-red-400 dark:focus:ring-red-600 focus:bg-white dark:focus:bg-[#1f0c0d] transition-all"
              />
            {search && (
              <button
                onClick={() => {
                  setSearch("");
                  setSearchResults([]);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <FiX size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Notification Dropdown */}
        {showNotifications && (
          <div className="absolute top-20 right-2 left-2 sm:left-auto sm:right-4 z-50 sm:w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 p-3 max-h-96 overflow-y-auto space-y-2">
            <div className="flex items-center justify-between px-1 py-1 border-b border-gray-100 dark:border-gray-700">
              <span className="font-semibold text-sm text-gray-700 dark:text-gray-200">Notifications</span>
              <button
                onClick={() => setShowNotifications(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX size={16} />
              </button>
            </div>

            {friendSummary.incoming.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500 px-1">Friend requests</p>
                {friendSummary.incoming.map((req) => (
                  <div
                    key={req._id}
                    className="flex items-center gap-3 px-2 py-2 bg-gray-50 dark:bg-gray-900/40 rounded-lg"
                  >
                    <img
                      src={req.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.username}`}
                      alt={req.name}
                      className="w-9 h-9 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{req.name}</p>
                      <p className="text-xs text-red-400">@{req.username}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleRespondFriendRequest(req._id, "accept")}
                        className="px-2.5 py-1.5 rounded-full bg-green-500 text-white text-xs font-semibold"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleRespondFriendRequest(req._id, "decline")}
                        className="px-2.5 py-1.5 rounded-full bg-red-500 text-white text-xs font-semibold"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {notifications.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500 px-1">Chat alerts</p>
                {notifications.map((notif) => (
                  <button
                    key={notif._id}
                    onClick={() => {
                      onSelectChat(notif.chat);
                      setShowNotifications(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-rose-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                      {notif.chat.isGroupChat
                        ? `New in ${notif.chat.chatName}`
                        : `New from ${notif.message.sender.name}`}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{notif.message.content}</p>
                  </button>
                ))}
              </div>
            )}

            {friendSummary.incoming.length === 0 && notifications.length === 0 && (
              <p className="text-center text-xs text-gray-400 dark:text-gray-500 py-4">You&apos;re all caught up ✨</p>
            )}
          </div>
        )}

        {/* Search Results */}
        {search && (
          <div className="p-2 border-b border-gray-100 dark:border-gray-700 max-h-60 overflow-y-auto">
            {searchLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-purple-500 border-t-transparent" />
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((result) => (
                <div
                  key={result._id}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-rose-50 dark:hover:bg-red-900/30 rounded-xl transition-all"
                >
                  <img
                    src={result.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${result.username}`}
                    alt={result.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="text-left flex-1 min-w-0">
                    <p className="font-medium text-gray-800 dark:text-gray-100 text-sm truncate">{result.name}</p>
                    <p className="text-xs text-red-400 font-medium">@{result.username}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{result.email}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    {result.relationshipStatus === "friends" && (
                      <button
                        onClick={() => handleAccessChat(result._id)}
                        className="px-3 py-1.5 rounded-full bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
                      >
                        Message
                      </button>
                    )}
                    {result.relationshipStatus === "none" && (
                      <button
                        onClick={() => handleSendFriendRequest(result.username, result._id)}
                        className="px-3 py-1.5 rounded-full border border-red-400 text-red-600 dark:text-red-300 text-xs font-semibold hover:bg-rose-50 dark:hover:bg-purple-900/40 flex items-center gap-1"
                      >
                        <FiUserPlus size={14} />
                        Request
                      </button>
                    )}
                    {result.relationshipStatus === "outgoing" && (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 text-xs font-medium">
                        <FiClock size={12} />
                        Sent
                      </span>
                    )}
                    {result.relationshipStatus === "incoming" && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleRespondFriendRequest(result._id, "accept")}
                          className="px-2.5 py-1.5 rounded-full bg-green-500 text-white text-xs font-semibold"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleRespondFriendRequest(result._id, "decline")}
                          className="px-2.5 py-1.5 rounded-full bg-red-500 text-white text-xs font-semibold"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-sm text-gray-400 py-3">No users found</p>
            )}
          </div>
        )}

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
              <FiEdit2 size={32} className="mb-3" />
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs mt-1">Search for a user to start chatting</p>
            </div>
          ) : (
            chats.map((chat) => {
              const notifCount = getChatNotificationCount(chat._id);
              return (
                <button
                  key={chat._id}
                  onClick={() => onSelectChat(chat)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all border-b border-gray-50 dark:border-gray-800 ${
                    selectedChat?._id === chat._id ? "bg-rose-50 dark:bg-red-900/30 border-l-4 border-l-red-600" : ""
                  }`}
                >
                  <div className="relative">
                    <img
                      src={getSenderAvatar(chat)}
                      alt={getSenderName(chat)}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    {isUserOnline(chat) && (
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full" />
                    )}
                    {chat.isGroupChat && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center">
                        <FiUsers size={10} className="text-white" />
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm truncate">
                        {getSenderName(chat)}
                      </p>
                      {chat.latestMessage && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 ml-2">
                          {formatTime(chat.latestMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center gap-0.5">
                        {chat.latestMessage ? (
                          <>
                            {chat.latestMessage.sender._id === user?._id && (
                              <span className="inline-flex items-center shrink-0 mr-0.5">
                                {chat.latestMessage.status === "read" ? (
                                  <span className="text-blue-500 flex">
                                    <FiCheck size={11} className="-mr-1.5" strokeWidth={3} />
                                    <FiCheck size={11} strokeWidth={3} />
                                  </span>
                                ) : chat.latestMessage.status === "delivered" ? (
                                  <span className="text-gray-400 flex">
                                    <FiCheck size={11} className="-mr-1.5" strokeWidth={3} />
                                    <FiCheck size={11} strokeWidth={3} />
                                  </span>
                                ) : (
                                  <FiCheck size={11} strokeWidth={3} className="text-gray-400" />
                                )}
                              </span>
                            )}
                            <span className="truncate">
                              {chat.isGroupChat ? chat.latestMessage.sender.name + ": " : ""}{chat.latestMessage.content}
                            </span>
                          </>
                        ) : (
                          "No messages yet"
                        )}
                      </p>
                      {notifCount > 0 && (
                        <span className="ml-2 shrink-0 w-5 h-5 bg-red-600 text-white text-xs rounded-full flex items-center justify-center font-bold">
                          {notifCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Modals */}
      {showGroupModal && (
        <GroupChatModal
          onClose={() => setShowGroupModal(false)}
          onRefreshChats={onRefreshChats}
        />
      )}

      {showProfile && (
        <ProfileModal onClose={() => setShowProfile(false)} />
      )}

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </>
  );
}
