"use client";

import { useChatStore, ChatUser } from "@/store/chatStore";
import { FiX, FiInfo, FiMessageCircle, FiAtSign } from "react-icons/fi";

interface FriendProfileModalProps {
  friendUser: ChatUser;
  onClose: () => void;
}

export default function FriendProfileModal({ friendUser, onClose }: FriendProfileModalProps) {
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const isOnline = onlineUsers.includes(friendUser._id);

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative">
          {/* Gradient banner */}
          <div className="h-28 bg-linear-to-br from-purple-500 via-purple-600 to-indigo-600" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-black/20 hover:bg-black/30 transition-colors"
          >
            <FiX size={18} className="text-white" />
          </button>

          {/* Avatar overlapping banner */}
          <div className="flex justify-center -mt-14">
            <div className="relative">
              <img
                src={
                  friendUser.avatar ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${friendUser.name}`
                }
                alt={friendUser.name}
                className="w-28 h-28 rounded-full object-cover border-4 border-white dark:border-gray-900 shadow-lg"
              />
              {/* Online indicator */}
              <span
                className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-[3px] border-white dark:border-gray-900 ${
                  isOnline ? "bg-green-500" : "bg-gray-400"
                }`}
              />
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="px-6 pt-4 pb-6 text-center space-y-4">
          {/* Name & Status */}
          <div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
              {friendUser.name}
            </h3>
            <p className={`text-sm font-medium mt-0.5 ${isOnline ? "text-green-500" : "text-gray-400 dark:text-gray-500"}`}>
              {isOnline ? "● Online" : "● Offline"}
            </p>
          </div>

          {/* Details cards */}
          <div className="space-y-3 text-left">
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <div className="p-2 bg-rose-100 dark:bg-red-900/40 rounded-lg">
                <FiAtSign size={18} className="text-red-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Username</p>
                <p className="text-sm text-gray-700 dark:text-gray-200 truncate">@{friendUser.username || "unknown"}</p>
              </div>
            </div>

            {/* About */}
            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                <FiInfo size={18} className="text-blue-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">About</p>
                <p className="text-sm text-gray-700 dark:text-gray-200">
                  {friendUser.about || "Hey there! I'm using TalkWithMe 👋"}
                </p>
              </div>
            </div>
          </div>

          {/* Send Message button */}
          <button
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-red-200 dark:shadow-red-900/30"
          >
            <FiMessageCircle size={18} />
            Send Message
          </button>
        </div>
      </div>
    </div>
  );
}
