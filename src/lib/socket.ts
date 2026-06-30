"use client";

import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

/** Lazily create a single shared Socket.IO connection (cookie-authenticated). */
export function getSocket(): Socket {
  if (!socket) {
    socket = io({
      path: "/socket.io",
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
