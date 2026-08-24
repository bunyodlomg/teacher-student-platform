import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

/** Per-user read state — oxirgi o'qilgan vaqt (o'qilmagan sonini hisoblash uchun). */
const ReadStateSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    lastReadAt: { type: Date, default: null },
  },
  { _id: false }
);

/** Oxirgi xabar — ro'yxatda tez ko'rsatish uchun denormalizatsiya. */
const LastMessageSchema = new Schema(
  {
    body: { type: String, default: "" },
    senderId: { type: Schema.Types.ObjectId, ref: "User" },
    at: { type: Date },
  },
  { _id: false }
);

const ConversationSchema = new Schema(
  {
    kind: { type: String, enum: ["group", "direct"], required: true },
    // group chat — bitta guruhga bitta suhbat
    groupId: { type: Schema.Types.ObjectId, ref: "Group" },
    // direct chat — ikki a'zo
    participantIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    // direct dedupe kaliti: saralangan "idA:idB"
    directKey: { type: String },
    lastMessage: { type: LastMessageSchema, default: undefined },
    lastMessageAt: { type: Date },
    reads: { type: [ReadStateSchema], default: [] },
  },
  { timestamps: true }
);

// Har bir guruhga faqat bitta group-suhbat
ConversationSchema.index(
  { groupId: 1 },
  { unique: true, partialFilterExpression: { kind: "group" } }
);
// Har juftlikka faqat bitta direct-suhbat
ConversationSchema.index(
  { directKey: 1 },
  { unique: true, partialFilterExpression: { kind: "direct" } }
);
ConversationSchema.index({ participantIds: 1, lastMessageAt: -1 });

export type ConversationDoc = InferSchemaType<typeof ConversationSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const Conversation: Model<ConversationDoc> =
  (mongoose.models.Conversation as Model<ConversationDoc>) ||
  mongoose.model<ConversationDoc>("Conversation", ConversationSchema);
