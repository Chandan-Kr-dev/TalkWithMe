"use client";

import Image from "next/image";

export default function WelcomeScreen() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-linear-to-br from-[#fff3f3] to-[#ffe4e6] dark:from-[#050304] dark:to-[#140808] p-8">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-white dark:bg-[#0f0607] shadow-xl ring-1 ring-red-200 dark:ring-red-900/40 mb-6 p-4 overflow-hidden">
          <Image
            src="/logo.png"
            alt="TalkWithMe logo"
            width={80}
            height={80}
            className="h-full w-full rounded-full object-cover"
            priority
          />
        </div>
        <h2 className="text-3xl font-bold text-red-900 dark:text-red-100 mb-3">TalkWithMe</h2>
        <p className="text-red-900/70 dark:text-red-200/70 text-lg max-w-md">
          Select a conversation from the sidebar or search for a user to start chatting!
        </p>
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-red-400 dark:text-red-300">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          End-to-end encrypted messages
        </div>
      </div>
    </div>
  );
}
