"use client";

import { useState } from "react";
import { useChatStore, ChatData, ChatUser } from "@/store/chatStore";
import { FiX, FiSearch, FiUserPlus, FiUserMinus, FiEdit2 } from "react-icons/fi";
import toast from "react-hot-toast";

interface GroupInfoModalProps {
  chat: ChatData;
  onClose: () => void;
  onRefreshChats: () => void;
}

export default function GroupInfoModal({ chat, onClose, onRefreshChats }: GroupInfoModalProps) {
  const { user } = useChatStore();
  const [isEditing, setIsEditing] = useState(false);
  const [groupName, setGroupName] = useState(chat.chatName);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<ChatUser[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);

  const isAdmin = chat.groupAdmin?._id === user?._id;

  const handleRename = async () => {
    if (!groupName.trim()) return;

    try {
      const res = await fetch("/api/chat/group", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({ chatId: chat._id, chatName: groupName }),
      });

      if (res.ok) {
        toast.success("Group renamed");
        onRefreshChats();
        setIsEditing(false);
      }
    } catch {
      toast.error("Failed to rename");
    }
  };

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
    } catch {
      console.error("Search error");
    }
  };

  const handleAddUser = async (userId: string) => {
    try {
      const res = await fetch("/api/chat/group/add", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({ chatId: chat._id, userId }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("User added");
        onRefreshChats();
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("Failed to add user");
    }
  };

  const handleRemoveUser = async (userId: string) => {
    try {
      const res = await fetch("/api/chat/group/remove", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({ chatId: chat._id, userId }),
      });

      if (res.ok) {
        if (userId === user?._id) {
          toast.success("You left the group");
          useChatStore.getState().setSelectedChat(null);
          onClose();
        } else {
          toast.success("User removed");
        }
        onRefreshChats();
      }
    } catch {
      toast.error("Failed to remove user");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10 rounded-t-2xl">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Group Info</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
            <FiX size={20} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Group Avatar & Name */}
          <div className="flex flex-col items-center gap-3">
            <img
              src={chat.groupAvatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${chat.chatName}`}
              alt={chat.chatName}
              className="w-20 h-20 rounded-full"
            />
            {isEditing ? (
              <div className="flex items-center gap-2 w-full">
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-300 dark:focus:ring-purple-600"
                />
                <button
                  onClick={handleRename}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600"
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h4 className="text-xl font-bold text-gray-800 dark:text-gray-100">{chat.chatName}</h4>
                {isAdmin && (
                  <button onClick={() => setIsEditing(true)} className="text-gray-400 hover:text-purple-500">
                    <FiEdit2 size={16} />
                  </button>
                )}
              </div>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400">{chat.users.length} members</p>
          </div>

          {/* Members */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h5 className="font-semibold text-gray-700 dark:text-gray-200 text-sm">Members</h5>
              {isAdmin && (
                <button
                  onClick={() => setShowAddUser(!showAddUser)}
                  className="text-purple-500 text-sm font-medium flex items-center gap-1 hover:text-purple-700"
                >
                  <FiUserPlus size={16} /> Add
                </button>
              )}
            </div>

            {/* Add User Search */}
            {showAddUser && (
              <div className="mb-3 space-y-2">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input
                    type="text"
                    placeholder="Search users to add..."
                    value={search}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-300 dark:focus:ring-purple-600"
                  />
                </div>
                {searchResults.length > 0 && (
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {searchResults.map((u) => (
                      <button
                        key={u._id}
                        onClick={() => handleAddUser(u._id)}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg text-sm"
                      >
                        <img
                          src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`}
                          alt={u.name}
                          className="w-7 h-7 rounded-full"
                        />
                        <span className="text-gray-800 dark:text-gray-200">{u.name}</span>
                        <FiUserPlus size={14} className="ml-auto text-purple-500" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Members List */}
            <div className="space-y-1">
              {chat.users.map((member) => (
                <div key={member._id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800">
                  <img
                    src={member.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`}
                    alt={member.name}
                    className="w-9 h-9 rounded-full"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                      {member.name}
                      {member._id === user?._id && " (You)"}
                    </p>
                    {member._id === chat.groupAdmin?._id && (
                      <span className="text-xs text-purple-500 font-medium">Admin</span>
                    )}
                  </div>
                  {isAdmin && member._id !== user?._id && (
                    <button
                      onClick={() => handleRemoveUser(member._id)}
                      className="p-1.5 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <FiUserMinus size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Leave Group */}
          <button
            onClick={() => handleRemoveUser(user?._id || "")}
            className="w-full py-3 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400 font-semibold hover:bg-red-100 dark:hover:bg-red-900/50 transition-all"
          >
            Leave Group
          </button>
        </div>
      </div>
    </div>
  );
}
