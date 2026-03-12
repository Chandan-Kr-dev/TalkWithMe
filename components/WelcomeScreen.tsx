"use client";

import Image from "next/image";

export default function WelcomeScreen() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 p-8">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-white dark:bg-gray-900 shadow-xl ring-1 ring-purple-100 dark:ring-purple-900/40 mb-6 p-4 overflow-hidden">
          <Image
            src="/logo.png"
            alt="TalkWithMe logo"
            width={80}
            height={80}
            className="h-full w-full rounded-full object-cover"
            priority
          />
        </div>
        <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-3">TalkWithMe</h2>
        <p className="text-gray-500 dark:text-gray-400 text-lg max-w-md">
          Select a conversation from the sidebar or search for a user to start chatting!
        </p>
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-gray-400 dark:text-gray-500">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          End-to-end encrypted messages
        </div>
      </div>
    </div>
  );
}
