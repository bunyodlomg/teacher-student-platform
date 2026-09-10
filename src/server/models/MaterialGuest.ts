import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

/**
 * Loginsiz (mehmon) foydalanuvchining ochiq materiallarga kirishi.
 *
 * Brauzer kompyuterning OS foydalanuvchi nomini o'qiy olmaydi, shuning uchun
 * har bir qurilmaga bir marta `deviceId` (localStorage) beriladi va guruh
 * ichida ketma-ket "Kompyuter-1", "Kompyuter-2" ... yorlig'i biriktiriladi.
 * Ism ham majburiy — shu ikkisi birga kirishni to'liq anonim bo'lmasligini
 * ta'minlaydi.
 */
const MaterialEventSchema = new Schema(
  {
    action: { type: String, enum: ["open", "download"], required: true },
    postId: { type: Schema.Types.ObjectId, ref: "Post" },
    fileName: { type: String, default: "" },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const MaterialGuestSchema = new Schema(
  {
    groupId: {
      type: Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      index: true,
    },
    /** klient tomonda saqlanadigan qurilma identifikatori */
    deviceId: { type: String, required: true },
    /** "Kompyuter-3" */
    label: { type: String, required: true },
    seq: { type: Number, required: true },
    name: { type: String, required: true },
    grade: { type: String, default: "" },
    /** keyingi so'rovlarni (log) himoyalash uchun maxfiy token */
    token: { type: String, required: true },
    opens: { type: Number, default: 0 },
    downloads: { type: Number, default: 0 },
    lastSeenAt: { type: Date, default: Date.now },
    /** oxirgi harakatlar (eng yangisi oxirida), 200 tagacha */
    events: [MaterialEventSchema],
  },
  { timestamps: true }
);

// Bitta qurilma — guruh ichida bitta yozuv.
MaterialGuestSchema.index({ groupId: 1, deviceId: 1 }, { unique: true });

export type MaterialGuestDoc = InferSchemaType<typeof MaterialGuestSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const MaterialGuest: Model<MaterialGuestDoc> =
  (mongoose.models.MaterialGuest as Model<MaterialGuestDoc>) ||
  mongoose.model<MaterialGuestDoc>("MaterialGuest", MaterialGuestSchema);
