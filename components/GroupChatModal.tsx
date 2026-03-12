"use client";

import { useState } from "react";
import { useChatStore, ChatUser } from "@/store/chatStore";
import { FiX, FiSearch } from "react-icons/fi";
import toast from "react-hot-toast";

interface GroupChatModalProps {
  onClose: () => void;
  onRefreshChats: () => void;
}

export default function GroupChatModal({ onClose, onRefreshChats }: GroupChatModalProps) {
  const { user } = useChatStore();
  const [groupName, setGroupName] = useState("");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<ChatUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<ChatUser[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (query: string) => {
    setSearch(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const res = await fetch(`/api/user?search=${query}`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      const data = await res.json();
      if (res.ok) setSearchResults(data);
    } catch (error) {
      console.error("Search error:", error);
    }
  };

  const addUser = (userToAdd: ChatUser) => {
    if (selectedUsers.some((u) => u._id === userToAdd._id)) {
      toast.error("User already added");
      return;
    }
    setSelectedUsers([...selectedUsers, userToAdd]);
  };

  const removeUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter((u) => u._id !== userId));
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error("Please enter group name");
      return;
    }
    if (selectedUsers.length < 2) {
      toast.error("Please add at least 2 users");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/chat/group", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({
          name: groupName,
          users: selectedUsers.map((u) => u._id),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Group created!");
        onRefreshChats();
        onClose();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Create group error:", error);
      toast.error("Failed to create group");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">New Group Chat</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <FiX size={20} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Group Name */}
          <input
            type="text"
            placeholder="Group Name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-300 dark:focus:ring-purple-600 focus:bg-white dark:focus:bg-gray-700 transition-all"
          />

          {/* Search Users */}
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={16} />
            <input
              type="text"
              placeholder="Add users (e.g. John, Jane)"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-300 dark:focus:ring-purple-600 focus:bg-white dark:focus:bg-gray-700 transition-all"
            />
          </div>

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map((u) => (
                <span
                  key={u._id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium"
                >
                  {u.name}
                  <button onClick={() => removeUser(u._id)} className="hover:text-purple-900">
                    <FiX size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="max-h-40 overflow-y-auto space-y-1">
              {searchResults.map((u) => (
                <button
                  key={u._id}
                  onClick={() => addUser(u)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-xl transition-all"
                >
                  <img
                    src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`}
                    alt={u.name}
                    className="w-9 h-9 rounded-full"
                  />
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{u.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{u.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Create Button */}
          <button
            onClick={handleCreateGroup}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-purple-500 text-white font-semibold hover:bg-purple-600 disabled:opacity-50 transition-all shadow-lg"
          >
            {loading ? "Creating..." : "Create Group"}
          </button>
        </div>
      </div>
    </div>
  );
}
