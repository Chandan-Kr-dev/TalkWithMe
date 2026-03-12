"use client";

import { useEffect } from "react";
import { useChatStore } from "@/store/chatStore";

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useChatStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  return <>{children}</>;
}
