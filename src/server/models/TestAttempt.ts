import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

const AnswerSchema = new Schema(
  {
    questionId: { type: String, required: true },
    optionId: { type: String },
    text: { type: String },
    correct: { type: Boolean },
  },
  { _id: false }
);

// Har o'quvchi uchun serverda saqlangan aralashtirilgan tartib — refresh/resume
// da bir xil ketma-ketlik ko'rsatiladi va baholash to'g'ri bo'ladi.
const ServedSchema = new Schema(
  {
    questionId: { type: String, required: true },
    optionIds: [{ type: String }],
  },
  { _id: false }
);

/** Loginи yo'q (mehmon) ishtirokchining ma'lumotlari. */
const GuestSchema = new Schema(
  {
    name: { type: String, required: true },
    grade: { type: String, default: "" }, // sinf, masalan "9-A"
    phone: { type: String, default: "" },
  },
  { _id: false }
);

const TestAttemptSchema = new Schema(
  {
    testId: { type: Schema.Types.ObjectId, ref: "Test", required: true, index: true },
    // ro'yxatdan o'tgan o'quvchi uchun — User id; mehmon uchun sintetik (noyob) id
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    // mehmon (loginsiz) urinishi
    isGuest: { type: Boolean, default: false },
    guest: { type: GuestSchema, default: undefined },
    // mehmon urinishini himoyalash uchun maxfiy token (answer/submit'da tekshiriladi)
    guestToken: { type: String },
    startedAt: { type: Date, default: Date.now },
    endsAt: { type: Date, required: true },
    submittedAt: { type: Date },
    status: {
      type: String,
      enum: ["in_progress", "submitted", "auto_submitted"],
      default: "in_progress",
    },
    score: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
    totalCount: { type: Number, default: 0 },
    violations: { type: Number, default: 0 },
    answers: [AnswerSchema],
    served: [ServedSchema],
  },
  { timestamps: true }
);

// Bitta o'quvchi — bitta urinish.
TestAttemptSchema.index({ testId: 1, studentId: 1 }, { unique: true });

export type TestAttemptDoc = InferSchemaType<typeof TestAttemptSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const TestAttempt: Model<TestAttemptDoc> =
  (mongoose.models.TestAttempt as Model<TestAttemptDoc>) ||
  mongoose.model<TestAttemptDoc>("TestAttempt", TestAttemptSchema);
