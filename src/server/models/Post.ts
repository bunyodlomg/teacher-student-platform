import mongoose, { Schema, InferSchemaType, Model } from "mongoose";
import { AttachmentSchema, ReactionSchema, CommentSchema } from "./subdocs";

const PostSchema = new Schema(
  {
    groupId: { type: Schema.Types.ObjectId, ref: "Group", required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["lesson", "announcement", "assignment"],
      required: true,
    },
    title: { type: String, required: true },
    // Matn ixtiyoriy — e'lon/dars faqat sarlavha bilan ham bo'lishi mumkin.
    // Mongoose'da `required: true` bo'sh satrni ('') rad etadi, shu sabab default bilan ixtiyoriy.
    body: { type: String, default: "" },
    tags: [{ type: String }],
    pinned: { type: Boolean, default: false },
    assignmentId: { type: Schema.Types.ObjectId, ref: "Assignment" },
    attachments: [AttachmentSchema],
    reactions: [ReactionSchema],
    comments: [CommentSchema],
    // unique viewers — one entry per user, so a view is only ever counted once
    views: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export type PostDoc = InferSchemaType<typeof PostSchema> & { _id: mongoose.Types.ObjectId };

export const Post: Model<PostDoc> =
  (mongoose.models.Post as Model<PostDoc>) ||
  mongoose.model<PostDoc>("Post", PostSchema);
