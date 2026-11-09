import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, min: 1, max: 5, default: null },
    message: { type: String, maxlength: 1000, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('Feedback', feedbackSchema);
