import { randomBytes } from "node:crypto";
import type { Types } from "mongoose";
import { Group, MaterialGuest, Post } from "./models";
import type { GroupDoc, MaterialGuestDoc, PostDoc } from "./models";
import { sAttachment } from "./serialize";
import type { PublicMaterial } from "@/lib/types";

/** Ochiq havolada faqat shu turdagi postlar ko'rsatiladi. */
const SHARABLE_TYPES = ["lesson", "announcement"];

export type Scope = "g" | "p";

export const isScope = (v: string): v is Scope => v === "g" || v === "p";

export interface Target {
  scope: Scope;
  group: GroupDoc;
  /** scope === "p" bo'lganda — ulashilgan yagona dars */
  post?: PostDoc & { createdAt: Date };
  posts: (PostDoc & { createdAt: Date })[];
}

/**
 * Ochiq havolani ochadi: guruh yoki bitta dars.
 * Ochiq bo'lmasa `null` qaytaradi (chaqiruvchi 403/404 beradi).
 */
export async function loadPublicTarget(
  scope: Scope,
  id: string
): Promise<Target | null> {
  if (scope === "p") {
    let post;
    try {
      post = await Post.findById(id).lean().exec();
    } catch {
      return null;
    }
    if (!post) return null;
    const group = await Group.findById(post.groupId).lean().exec();
    if (!group) return null;
    // dars alohida ulashilgan bo'lsa ham, guruh butunlay ochiq bo'lsa ham ochiladi
    if (!post.isPublic && !group.materialsPublic) return null;
    const typed = post as PostDoc & { createdAt: Date };
    return { scope, group: group as GroupDoc, post: typed, posts: [typed] };
  }

  let group;
  try {
    group = await Group.findById(id).lean().exec();
  } catch {
    return null;
  }
  if (!group || !group.materialsPublic) return null;

  const posts = await Post.find({
    groupId: group._id,
    type: { $in: SHARABLE_TYPES },
  })
    .sort({ createdAt: -1 })
    .lean()
    .exec();

  return {
    scope,
    group: group as GroupDoc,
    posts: posts as (PostDoc & { createdAt: Date })[],
  };
}

/** Faqat biriktirilgan fayli bor darslar material sifatida ko'rsatiladi. */
export function withFiles(posts: (PostDoc & { createdAt: Date })[]) {
  return posts.filter((p) => (p.attachments ?? []).length > 0);
}

export function sPublicMaterial(
  p: PostDoc & { createdAt: Date }
): PublicMaterial {
  return {
    id: p._id.toString(),
    title: p.title,
    body: p.body ?? "",
    createdAt: new Date(p.createdAt).toISOString(),
    attachments: (p.attachments ?? []).map((a) =>
      sAttachment(a as unknown as Parameters<typeof sAttachment>[0])
    ),
  };
}

export function countFiles(posts: { attachments?: unknown[] }[]): number {
  return posts.reduce((n, p) => n + (p.attachments ?? []).length, 0);
}

/**
 * Qurilmani guruh doirasida ro'yxatga oladi (yoki mavjudini qaytaradi).
 * Yorliq — "Kompyuter-N": guruhdagi atomik hisoblagichdan olinadi, shu sabab
 * bir vaqtda kirgan qurilmalar ham har xil raqam oladi.
 */
export async function registerGuest(
  groupId: Types.ObjectId,
  deviceId: string,
  name: string,
  grade: string
): Promise<MaterialGuestDoc> {
  const existing = await MaterialGuest.findOne({ groupId, deviceId }).exec();
  if (existing) {
    existing.name = name;
    if (grade) existing.grade = grade;
    existing.lastSeenAt = new Date();
    await existing.save();
    return existing;
  }

  const g = await Group.findByIdAndUpdate(
    groupId,
    { $inc: { guestSeq: 1 } },
    { new: true, projection: { guestSeq: 1 } }
  ).exec();
  const seq = g?.guestSeq ?? 1;

  try {
    return await MaterialGuest.create({
      groupId,
      deviceId,
      seq,
      label: `Kompyuter-${seq}`,
      name,
      grade,
      token: randomBytes(16).toString("hex"),
      opens: 0,
      downloads: 0,
      lastSeenAt: new Date(),
      events: [],
    });
  } catch {
    // poyga: shu qurilma parallel so'rovda yaratilgan bo'lishi mumkin
    const again = await MaterialGuest.findOne({ groupId, deviceId }).exec();
    if (again) return again;
    throw new Error("guest-create-failed");
  }
}

const MAX_EVENTS = 200;

/** Mehmon harakatini jurnalga yozadi (oxirgi 200 tasi saqlanadi). */
export async function logGuestEvent(
  guest: MaterialGuestDoc,
  action: "open" | "download",
  postId?: string,
  fileName?: string
) {
  const counter = action === "download" ? "downloads" : "opens";
  await MaterialGuest.updateOne(
    { _id: guest._id },
    {
      $inc: { [counter]: 1 },
      $set: { lastSeenAt: new Date() },
      $push: {
        events: {
          $each: [
            {
              action,
              postId: postId || undefined,
              fileName: fileName || "",
              at: new Date(),
            },
          ],
          $slice: -MAX_EVENTS,
        },
      },
    }
  ).exec();
}
