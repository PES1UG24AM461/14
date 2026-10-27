import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
    selectedOption: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

// SAD 4.4: one attempt record per student per quiz; deadline and score are decided by the server.
const attemptSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    answers: { type: [answerSchema], default: [] },
    score: { type: Number, default: null },
    status: { type: String, enum: ['in_progress', 'finalized'], default: 'in_progress' },
    startedAt: { type: Date, required: true },
    deadlineAt: { type: Date, required: true },
    submittedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// FR-013 / NFR-002: the unique index makes a second attempt record for the same student and quiz impossible.
attemptSchema.index({ userId: 1, quizId: 1 }, { unique: true });

export default mongoose.model('Attempt', attemptSchema);
