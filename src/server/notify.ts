import { connectDB } from "./db";
import { Notification } from "./models";
import { emitToUser } from "./io";
import { sNotification } from "./serialize";

export interface NotifyInput {
  userId: string;
  type: string;
  title: string;
  body: string;
  groupId?: string;
  link?: string;
}

/** Persist a notification and push it to the user in real time. */
export async function notify(input: NotifyInput) {
  await connectDB();
  const n = await Notification.create({
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    groupId: input.groupId,
    link: input.link,
  });
  emitToUser(input.userId, "notification:new", sNotification(n.toObject()));
  return n;
}

/** Notify many users with the same payload (per-user title/body builder). */
export async function notifyMany(
  userIds: string[],
  build: (userId: string) => Omit<NotifyInput, "userId">
) {
  await Promise.all(
    userIds.map((userId) => notify({ userId, ...build(userId) }))
  );
}
