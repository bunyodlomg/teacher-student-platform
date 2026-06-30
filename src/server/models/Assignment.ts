import mongoose, { Schema, InferSchemaType, Model } from "mongoose";
import { AttachmentSchema } from "./subdocs";

const AssignmentSchema = new Schema(
  {
    groupId: { type: Schema.Types.ObjectId, ref: "Group", required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    dueDate: { type: Date, required: true },
    points: { type: Number, default: 100 },
    attachments: [AttachmentSchema],
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export type AssignmentDoc = InferSchemaType<typeof AssignmentSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Assignment: Model<AssignmentDoc> =
  (mongoose.models.Assignment as Model<AssignmentDoc>) ||
  mongoose.model<AssignmentDoc>("Assignment", AssignmentSchema);
