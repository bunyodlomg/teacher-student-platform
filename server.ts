import "./src/server/polyfill";
import "./src/server/env";
import { createServer } from "node:http";
import next from "next";
import { Server as IOServer } from "socket.io";
import { parse as parseCookie } from "cookie";
import { setIO, room } from "./src/server/io";
import { serveUpload } from "./src/server/static";
import { getUserFromToken, COOKIE_NAME } from "./src/server/auth";
import { connectDB } from "./src/server/db";
import { Group, Conversation } from "./src/server/models";
import { canAccessConversation } from "./src/server/chat";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  // Establish the Mongo connection up front so the first request isn't slow.
  try {
    await connectDB();
    console.log("> MongoDB ulanish o'rnatildi");
  } catch (e) {
    console.error("MongoDB ulanmadi:", e);
    process.exit(1);
  }

  const server = createServer((req, res) => {
    // Yuklangan fayllarni diskdan xizmat qilamiz — Next production build'dan
    // keyin public/uploads'ga qo'shilgan fayllarni bermaydi (404).
    if (req.url && req.url.startsWith("/uploads/")) {
      void serveUpload(req, res);
      return;
    }
    handle(req, res);
  });

  const io = new IOServer(server, {
    path: "/socket.io",
    cors: { origin: true, credentials: true },
  });
  setIO(io);

  io.on("connection", async (socket) => {
    try {
      const cookies = parseCookie(socket.handshake.headers.cookie || "");
      const user = await getUserFromToken(cookies[COOKIE_NAME]);
      if (!user) {
        socket.emit("unauthorized");
        socket.disconnect(true);
        return;
      }

      const userId = user._id.toString();

      // personal room (notifications, grades, direct events)
      socket.join(room.user(userId));

      // group rooms (feed, comments, reactions, announcements)
      const groups =
        user.role === "admin"
          ? await Group.find({}, { _id: 1 }).lean().exec()
          : user.role === "teacher"
          ? await Group.find({ teacherId: userId }, { _id: 1 }).lean().exec()
          : await Group.find({ studentIds: userId }, { _id: 1 }).lean().exec();
      for (const g of groups) socket.join(room.group(g._id.toString()));

      socket.emit("ready", {
        userId,
        groups: groups.map((g) => g._id.toString()),
      });

      // "yozmoqda..." — vaqtinchalik signal (DB'ga yozilmaydi).
      socket.on(
        "chat:typing",
        async (data: { conversationId?: string }) => {
          const conversationId = data?.conversationId;
          if (!conversationId) return;
          try {
            const conv = await Conversation.findById(conversationId)
              .lean()
              .exec();
            if (!conv) return;
            const ok = await canAccessConversation(
              { _id: userId, role: user.role },
              conv
            );
            if (!ok) return;
            const payload = { conversationId, userId, name: user.name };
            if (conv.kind === "group" && conv.groupId) {
              // yuboruvchidan boshqa hammaga (socket.to xonadagi o'zini chiqarib tashlaydi)
              socket
                .to(room.group(conv.groupId.toString()))
                .emit("chat:typing", payload);
            } else {
              for (const p of conv.participantIds ?? []) {
                const pid = p.toString();
                if (pid !== userId)
                  io.to(room.user(pid)).emit("chat:typing", payload);
              }
            }
          } catch {
            /* jim o'tkazamiz */
          }
        }
      );
    } catch (err) {
      console.error("socket connection error", err);
      socket.disconnect(true);
    }
  });

  server.listen(port, () => {
    console.log(
      `> Cambridge Learn ready on http://localhost:${port}  (${
        dev ? "development" : "production"
      })`
    );
  });
});
