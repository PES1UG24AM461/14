import mongoose from 'mongoose';

// SAD 4.4: a multiple-choice question. correctOption is server-only (select: false) and never sent to students.
const questionSchema = new mongoose.Schema(
  {
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
    prompt: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
      maxlength: [1000, 'Question text cannot exceed 1000 characters'],
    },
    options: {
      type: [{ type: String, trim: true, maxlength: 300 }],
      validate: [
        { validator: (v) => v.length >= 2, message: 'A question needs at least two options' },
        { validator: (v) => v.length <= 6, message: 'A question can have at most six options' },
        { validator: (v) => v.every((o) => o.length > 0), message: 'Options cannot be empty' },
      ],
    },
    correctOption: {
      type: Number,
      required: [true, 'The correct option is required'],
      select: false,
      validate: {
        validator(value) {
          return Number.isInteger(value) && value >= 0 && value < this.options.length;
        },
        message: 'The correct option must be one of the options',
      },
    },
  },
  { timestamps: true }
);

export default mongoose.model('Question', questionSchema);
