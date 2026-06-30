import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

const GroupSchema = new Schema(
  {
    name: { type: String, required: true },
    subject: { type: String, required: true },
    emoji: { type: String, default: "📘" },
    gradient: { type: String, default: "from-violet-600 to-indigo-600" },
    description: { type: String, default: "" },
    teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    studentIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export type GroupDoc = InferSchemaType<typeof GroupSchema> & { _id: mongoose.Types.ObjectId };

export const Group: Model<GroupDoc> =
  (mongoose.models.Group as Model<GroupDoc>) ||
  mongoose.model<GroupDoc>("Group", GroupSchema);
