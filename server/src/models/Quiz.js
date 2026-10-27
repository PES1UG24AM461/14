import mongoose from 'mongoose';

// SAD 4.4: a quiz owned by a faculty member or administrator; only published quizzes are visible to students.
const quizSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    topic: {
      type: String,
      required: [true, 'Topic is required'],
      trim: true,
      maxlength: [100, 'Topic cannot exceed 100 characters'],
    },
    durationSeconds: {
      type: Number,
      required: [true, 'Duration is required'],
      min: [60, 'Duration must be at least 60 seconds'],
      max: [4 * 60 * 60, 'Duration cannot exceed 4 hours'],
      validate: {
        validator: Number.isInteger,
        message: 'Duration must be a whole number of seconds',
      },
    },
    status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true }
);

export default mongoose.model('Quiz', quizSchema);
