"use client";

import { useState, useRef } from "react";
import { useChatStore } from "@/store/chatStore";
import { FiX, FiEdit2, FiMail, FiClock, FiCamera, FiAtSign } from "react-icons/fi";
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
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate on client side too
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only JPEG, PNG, WebP, and GIF images are allowed");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setUploadingAvatar(true);
    try {
      // Upload the file
      const formData = new FormData();
      formData.append("avatar", file);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.message);

      // Update user profile with new avatar URL
      const updateRes = await fetch("/api/user", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({ avatar: uploadData.url }),
      });

      const updateData = await updateRes.json();
      if (updateRes.ok && user) {
        setUser({ ...user, avatar: updateData.avatar });
        toast.success("Avatar updated!");
      } else {
        throw new Error("Failed to save avatar");
      }
    } catch {
      toast.error("Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

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
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Profile</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
            <FiX size={20} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Avatar */}
          <div className="flex flex-col items-center">
            <div className="relative group">
              <img
                src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=default`}
                alt="Profile"
                className="w-24 h-24 rounded-full ring-4 ring-purple-100 dark:ring-purple-900 object-cover"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
              >
                {uploadingAvatar ? (
                  <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <FiCamera size={22} className="text-white" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 mb-1">Hover avatar to change</p>
            {isEditing ? (
              <div className="w-full space-y-3 mt-2">
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-300 dark:focus:ring-purple-600"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">About</label>
                  <input
                    type="text"
                    value={about}
                    onChange={(e) => setAbout(e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-300 dark:focus:ring-purple-600"
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
                    className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-xl font-bold text-gray-800 dark:text-gray-100">{user?.name}</h4>
                  <button onClick={() => setIsEditing(true)} className="text-gray-400 hover:text-purple-500">
                    <FiEdit2 size={16} />
                  </button>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{user?.about}</p>
              </>
            )}
          </div>

          {!isEditing && (
            <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3 text-sm">
                <FiAtSign size={16} className="text-gray-400 dark:text-gray-500" />
                <span className="text-gray-600 dark:text-gray-300">@{user?.username || "unknown"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <FiMail size={16} className="text-gray-400 dark:text-gray-500" />
                <span className="text-gray-600 dark:text-gray-300">{user?.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <FiClock size={16} className="text-gray-400 dark:text-gray-500" />
                <span className="text-gray-600 dark:text-gray-300">Active now</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
