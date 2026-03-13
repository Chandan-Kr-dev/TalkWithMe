import type { Metadata } from "next";
import { Caveat, Inter } from "next/font/google";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const caveat = Caveat({
  weight: "400",
  variable: "--font-script",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TalkWithMe - Real-time Chat",
  description: "A real-time chat application built with Next.js, Socket.IO, and MongoDB",
  manifest: "/manifest.json",
  themeColor: "#b91c1c",
  icons: {
    icon: [
      { url: "/logo.png", sizes: "512x512", type: "image/png" },
      { url: "/favicon.ico", type: "image/x-icon" },
    ],
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "Talk With Me",
    description: "Chat instantly with friends",
    url: "https://talk-withme.vercel.app",
    siteName: "Talk With Me",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${caveat.variable} font-sans antialiased`}>
        <ThemeProvider>
          <div
            className="min-h-screen flex flex-col"
            style={{ "--footer-height": "72px" } as React.CSSProperties}
          >
            <main
              className="flex-1"
              style={{ minHeight: "calc(100vh - var(--footer-height))" }}
            >
              {children}
            </main>
            <footer
              className="sticky bottom-0 mt-auto h-(--footer-height) border-t border-(--border) bg-(--surface) text-base text-center text-foreground flex items-center justify-center px-4"
              style={{ display: "var(--footer-display, flex)" }}
            >
              <span className={`font-semibold text-lg text-(--accent-strong) ${caveat.className}`}>
                Made with love by Chandan Kr
              </span>
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
