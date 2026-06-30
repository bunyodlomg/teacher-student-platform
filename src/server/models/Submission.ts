import mongoose, { Schema, InferSchemaType, Model } from "mongoose";
import { AttachmentSchema } from "./subdocs";

const SubmissionSchema = new Schema(
  {
    assignmentId: {
      type: Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
    },
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, default: "" },
    status: {
      type: String,
      enum: ["not_started", "draft", "submitted", "approved", "rejected"],
      default: "draft",
    },
    submittedAt: { type: Date },
    score: { type: Number },
    feedback: { type: String },
    attachments: [AttachmentSchema],
  },
  { timestamps: true }
);

SubmissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });

export type SubmissionDoc = InferSchemaType<typeof SubmissionSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const Submission: Model<SubmissionDoc> =
  (mongoose.models.Submission as Model<SubmissionDoc>) ||
  mongoose.model<SubmissionDoc>("Submission", SubmissionSchema);
