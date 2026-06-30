import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

const NotificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: [
        "lesson",
        "assignment",
        "deadline",
        "feedback",
        "grade",
        "comment",
        "announcement",
      ],
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    read: { type: Boolean, default: false },
    groupId: { type: Schema.Types.ObjectId, ref: "Group" },
    link: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export type NotificationDoc = InferSchemaType<typeof NotificationSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Notification: Model<NotificationDoc> =
  (mongoose.models.Notification as Model<NotificationDoc>) ||
  mongoose.model<NotificationDoc>("Notification", NotificationSchema);
