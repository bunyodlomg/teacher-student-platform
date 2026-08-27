import mongoose, { Schema, InferSchemaType, Model } from "mongoose";
import { AttachmentSchema, ReactionSchema } from "./subdocs";

/** Javob berilgan xabarning qisqa surati (denormalizatsiya). */
const ReplyToSchema = new Schema(
  {
    messageId: { type: Schema.Types.ObjectId, ref: "Message", required: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    // matn yoki fayl uchun qisqa oldindan ko'rinish
    preview: { type: String, default: "" },
  },
  { _id: false }
);

const MessageSchema = new Schema(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    // matn ixtiyoriy — faqat fayl(lar)dan iborat xabar ham bo'lishi mumkin
    body: { type: String, default: "" },
    attachments: [AttachmentSchema],
    // emoji reaksiyalar (bir foydalanuvchi — bir emoji)
    reactions: { type: [ReactionSchema], default: [] },
    // javob berilgan xabar (ixtiyoriy)
    replyTo: { type: ReplyToSchema, default: undefined },
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
