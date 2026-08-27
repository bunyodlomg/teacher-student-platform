import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

const OptionSchema = new Schema(
  {
    text: { type: String, required: true },
  },
  { _id: true }
);

const QuestionSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["single", "boolean", "short"],
      default: "single",
    },
    text: { type: String, required: true },
    imageUrl: { type: String },
    options: [OptionSchema],
    // single/boolean uchun to'g'ri variant _id (string sifatida saqlanadi)
    correctOptionId: { type: String },
    // short javob uchun to'g'ri matn
    correctText: { type: String },
    points: { type: Number, default: 1 },
  },
  { _id: true }
);

const TestSchema = new Schema(
  {
    groupId: {
      type: Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      index: true,
    },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    subject: { type: String, default: "" },
    description: { type: String, default: "" },
    durationMin: { type: Number, default: 30 },
    questions: [QuestionSchema],
    shuffleQuestions: { type: Boolean, default: true },
    shuffleOptions: { type: Boolean, default: true },
    maxViolations: { type: Number, default: 3 },
    // ochiq (loginsiz) test — istalgan mehmon havola orqali ishlay oladi
    isPublic: { type: Boolean, default: false, index: true },
    status: {
      type: String,
      enum: ["draft", "open", "closed"],
      default: "draft",
      index: true,
    },
    opensAt: { type: Date },
    closesAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

export type TestDoc = InferSchemaType<typeof TestSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const Test: Model<TestDoc> =
  (mongoose.models.Test as Model<TestDoc>) ||
  mongoose.model<TestDoc>("Test", TestSchema);
