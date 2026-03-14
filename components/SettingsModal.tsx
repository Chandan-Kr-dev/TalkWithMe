"use client";

import { useState } from "react";
import { useChatStore } from "@/store/chatStore";
import {
  FiX,
  FiLock,
  FiSun,
  FiMoon,
  FiEye,
  FiEyeOff,
  FiChevronRight,
  FiShield,
  FiInfo,
  FiMonitor,
  FiSmartphone,
} from "react-icons/fi";
import toast from "react-hot-toast";

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const { user, theme, toggleTheme } = useChatStore();
  const [activeSection, setActiveSection] = useState<
    "menu" | "change-password"
  >("menu");

  // Change password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const desktopDownloadUrl = process.env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL;
  const androidDownloadUrl = process.env.NEXT_PUBLIC_ANDROID_DOWNLOAD_URL;

  const handleDownload = (url: string | undefined, label: string) => {
    if (!url) {
      toast.error(`${label} download link is not configured`);
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      toast.error("Please enter your current password");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
        setActiveSection("menu");
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            {activeSection !== "menu" && (
              <button
                onClick={() => setActiveSection("menu")}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors mr-1"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-gray-500 dark:text-gray-400"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            )}
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
              {activeSection === "menu" ? "Settings" : "Change Password"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <FiX size={20} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {activeSection === "menu" ? (
          <div className="p-4 space-y-1">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                  {theme === "light" ? (
                    <FiSun size={18} className="text-amber-600 dark:text-amber-400" />
                  ) : (
                    <FiMoon
                      size={18}
                      className="text-amber-600 dark:text-amber-400"
                    />
                  )}
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    Appearance
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {theme === "light" ? "Light mode" : "Dark mode"}
                  </p>
                </div>
              </div>
              <div
                className={`w-11 h-6 rounded-full transition-colors relative ${
                  theme === "dark" ? "bg-purple-500" : "bg-gray-300"
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                    theme === "dark" ? "translate-x-5.5" : "translate-x-0.5"
                  }`}
                />
              </div>
            </button>

            {/* Change Password */}
            <button
              onClick={() => setActiveSection("change-password")}
              className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                  <FiLock size={18} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    Change Password
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Update your password
                  </p>
                </div>
              </div>
              <FiChevronRight
                size={18}
                className="text-gray-400 dark:text-gray-500"
              />
            </button>

            Desktop download
            <button
              onClick={() => handleDownload(desktopDownloadUrl, "Desktop app")}
              className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                  <FiMonitor
                    size={18}
                    className="text-indigo-600 dark:text-indigo-400"
                  />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    Desktop App
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Download the latest release
                  </p>
                </div>
              </div>
              <span className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-500 text-white">
                Download
              </span>
            </button>

            {/* Android download */}
            <button
              onClick={() => handleDownload(androidDownloadUrl, "Android app")}
              className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                  <FiSmartphone
                    size={18}
                    className="text-emerald-600 dark:text-emerald-400"
                  />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    Android App
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Grab the APK build
                  </p>
                </div>
              </div>
              <span className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500 text-white">
                Download
              </span>
            </button>

            {/* Privacy */}
            <div className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                  <FiShield
                    size={18}
                    className="text-green-600 dark:text-green-400"
                  />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    Encryption
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Messages are encrypted (AES-256-GCM)
                  </p>
                </div>
              </div>
              <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-full">
                Active
              </span>
            </div>

            {/* App Info */}
            <div className="w-full flex items-center px-4 py-3.5 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                  <FiInfo
                    size={18}
                    className="text-purple-600 dark:text-purple-400"
                  />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    TalkWithMe
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Version 1.1.0
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Change Password Section */
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Enter your current password and choose a new one.
            </p>

            {/* Current Password */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-300 dark:focus:ring-purple-600 transition-all pr-12"
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  {showCurrentPassword ? (
                    <FiEyeOff size={16} />
                  ) : (
                    <FiEye size={16} />
                  )}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-300 dark:focus:ring-purple-600 transition-all pr-12"
                  placeholder="Enter new password (min 6 chars)"
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  {showNewPassword ? (
                    <FiEyeOff size={16} />
                  ) : (
                    <FiEye size={16} />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-300 dark:focus:ring-purple-600 transition-all"
                placeholder="Confirm new password"
                minLength={6}
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleChangePassword}
              disabled={changingPassword}
              className="w-full py-3 rounded-xl bg-purple-500 text-white text-sm font-semibold hover:bg-purple-600 disabled:opacity-50 transition-all mt-2"
            >
              {changingPassword ? "Updating..." : "Update Password"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
