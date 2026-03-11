"use client";

import { useState } from "react";
import { useChatStore } from "@/store/chatStore";
import { FiX, FiEdit2, FiMail, FiClock } from "react-icons/fi";
import toast from "react-hot-toast";

interface ProfileModalProps {
  onClose: () => void;
}

export default function ProfileModal({ onClose }: ProfileModalProps) {
  const { user, setUser } = useChatStore();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [about, setAbout] = useState(user?.about || "");
  const [loading, setLoading] = useState(false);

  const handleUpdateProfile = async () => {
    if (!name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/user", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({ name, about }),
      });

      const data = await res.json();
      if (res.ok && user) {
        setUser({ ...user, name: data.name, about: data.about });
        toast.success("Profile updated");
        setIsEditing(false);
      }
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800">Profile</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100">
            <FiX size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Avatar */}
          <div className="flex flex-col items-center">
            <img
              src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=default`}
              alt="Profile"
              className="w-24 h-24 rounded-full ring-4 ring-purple-100 mb-3"
            />
            {isEditing ? (
              <div className="w-full space-y-3 mt-2">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-100 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">About</label>
                  <input
                    type="text"
                    value={about}
                    onChange={(e) => setAbout(e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-100 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleUpdateProfile}
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-xl bg-purple-500 text-white text-sm font-semibold hover:bg-purple-600 disabled:opacity-50 transition-all"
                  >
                    {loading ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-xl font-bold text-gray-800">{user?.name}</h4>
                  <button onClick={() => setIsEditing(true)} className="text-gray-400 hover:text-purple-500">
                    <FiEdit2 size={16} />
                  </button>
                </div>
                <p className="text-sm text-gray-500">{user?.about}</p>
              </>
            )}
          </div>

          {!isEditing && (
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-3 text-sm">
                <FiMail size={16} className="text-gray-400" />
                <span className="text-gray-600">{user?.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <FiClock size={16} className="text-gray-400" />
                <span className="text-gray-600">Active now</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
