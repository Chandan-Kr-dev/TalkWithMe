"use client";

import { useCallback, useEffect, useState } from "react";
import { FiDownload } from "react-icons/fi";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms?: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt: () => Promise<void>;
}

export default function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      const promptEvent = event as BeforeInstallPromptEvent;
      promptEvent.preventDefault();
      setDeferredPrompt(promptEvent);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      setCanInstall(false);
    };

    const checkInstalled = () => {
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone;
      if (isStandalone) {
        setInstalled(true);
        setCanInstall(false);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    checkInstalled();

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    setCanInstall(false);
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  if (!canInstall || installed) return null;

  return (
    <button
      onClick={handleInstall}
      className="px-2.5 py-1.5 rounded-full bg-red-600 text-white text-[11px] font-semibold hover:bg-red-700 flex items-center gap-1"
      title="Install app"
    >
      <FiDownload size={14} />
      Install
    </button>
  );
}
