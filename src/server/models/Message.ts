import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

const MessageSchema = new Schema(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Suhbat ichida vaqt bo'yicha sahifalash uchun
MessageSchema.index({ conversationId: 1, createdAt: -1 });

export type MessageDoc = InferSchemaType<typeof MessageSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
};

export const Message: Model<MessageDoc> =
  (mongoose.models.Message as Model<MessageDoc>) ||
  mongoose.model<MessageDoc>("Message", MessageSchema);
