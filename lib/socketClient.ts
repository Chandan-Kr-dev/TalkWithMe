"use client";

import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let triedFallback = false;

const buildSocket = (url: string) =>
  io(url, {
    transports: ["websocket", "polling"],
    autoConnect: true,
  });

export const getSocket = (): Socket => {
  if (socket) return socket;

  const primaryUrl = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;
  const fallbackUrl = window.location.origin;

  socket = buildSocket(primaryUrl);

  socket.on("connect_error", () => {
    if (triedFallback || primaryUrl === fallbackUrl) return;
    triedFallback = true;
    socket?.disconnect();
    socket = buildSocket(fallbackUrl);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    triedFallback = false;
  }
};
