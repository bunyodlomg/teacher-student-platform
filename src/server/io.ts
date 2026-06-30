import type { Server as IOServer } from "socket.io";

/**
 * The Socket.IO server is created in the custom server (server.ts) and stored
 * on globalThis so that Next.js API route handlers can emit real-time events.
 */
const g = globalThis as unknown as { __io?: IOServer };

export function setIO(io: IOServer) {
  g.__io = io;
}

export function getIO(): IOServer | undefined {
  return g.__io;
}

export const room = {
  user: (id: string) => `user:${id}`,
  group: (id: string) => `group:${id}`,
};

/** Emit to a single user (all their connected devices). */
export function emitToUser(userId: string, event: string, payload: unknown) {
  g.__io?.to(room.user(userId)).emit(event, payload);
}

/** Emit to everyone subscribed to a group. */
export function emitToGroup(groupId: string, event: string, payload: unknown) {
  g.__io?.to(room.group(groupId)).emit(event, payload);
}

/** Emit to several users at once. */
export function emitToUsers(userIds: string[], event: string, payload: unknown) {
  if (!g.__io) return;
  for (const id of userIds) g.__io.to(room.user(id)).emit(event, payload);
}

/** Broadcast to every connected client (school-wide news). */
export function emitToAll(event: string, payload: unknown) {
  g.__io?.emit(event, payload);
}
