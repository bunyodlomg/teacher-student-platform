import "./src/server/polyfill";
import "./src/server/env";
import { createServer } from "node:http";
import next from "next";
import { Server as IOServer } from "socket.io";
import { parse as parseCookie } from "cookie";
import { setIO, room } from "./src/server/io";
import { getUserFromToken, COOKIE_NAME } from "./src/server/auth";
import { connectDB } from "./src/server/db";
import { Group } from "./src/server/models";

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

  const server = createServer((req, res) => handle(req, res));

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
