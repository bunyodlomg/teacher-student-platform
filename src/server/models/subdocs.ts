import { Schema } from "mongoose";

export const AttachmentSchema = new Schema(
  {
    kind: {
      type: String,
      enum: ["image", "video", "audio", "pdf", "doc", "slides", "link"],
      required: true,
    },
    name: { type: String, required: true },
    meta: { type: String },
    url: { type: String },
  },
  { _id: true }
);

export const ReactionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    emoji: { type: String, required: true },
  },
  { _id: false }
);

export const CommentSchema = new Schema(
  {
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);
