import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

/**
 * Ota-onaning Telegram chati ↔ telefon raqami bog'lanishi.
 * Ota-ona botga /start bosib kontaktini ulashganda yaratiladi.
 * `phoneKey` — raqamning oxirgi 9 raqami (kod/format farqidan qat'i nazar
 * moslashtirish uchun). Bitta chat — bitta yozuv (`chatId` noyob), lekin
 * bir telefonga bir necha ota-ona (ikki chat) bog'lanishi mumkin.
 */
const TelegramLinkSchema = new Schema(
  {
    chatId: { type: String, required: true, unique: true },
    phoneRaw: { type: String, default: "" },
    phoneKey: { type: String, required: true, index: true },
    name: { type: String, default: "" },
    username: { type: String, default: "" },
  },
  { timestamps: true }
);

export type TelegramLinkDoc = InferSchemaType<typeof TelegramLinkSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const TelegramLink: Model<TelegramLinkDoc> =
  (mongoose.models.TelegramLink as Model<TelegramLinkDoc>) ||
  mongoose.model<TelegramLinkDoc>("TelegramLink", TelegramLinkSchema);
