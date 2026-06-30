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
    body: { type: String, required: true },
    tags: [{ type: String }],
    pinned: { type: Boolean, default: false },
    assignmentId: { type: Schema.Types.ObjectId, ref: "Assignment" },
    attachments: [AttachmentSchema],
    reactions: [ReactionSchema],
    comments: [CommentSchema],
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export type PostDoc = InferSchemaType<typeof PostSchema> & { _id: mongoose.Types.ObjectId };

export const Post: Model<PostDoc> =
  (mongoose.models.Post as Model<PostDoc>) ||
  mongoose.model<PostDoc>("Post", PostSchema);
