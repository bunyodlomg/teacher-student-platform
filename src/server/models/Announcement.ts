import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

const AnnouncementSchema = new Schema(
  {
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    scope: {
      type: String,
      enum: ["school", "group"],
      default: "school",
    },
    groupId: { type: Schema.Types.ObjectId, ref: "Group" },
    title: { type: String, required: true },
    body: { type: String, required: true },
    pinned: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export type AnnouncementDoc = InferSchemaType<typeof AnnouncementSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Announcement: Model<AnnouncementDoc> =
  (mongoose.models.Announcement as Model<AnnouncementDoc>) ||
  mongoose.model<AnnouncementDoc>("Announcement", AnnouncementSchema);
