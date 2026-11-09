import mongoose from 'mongoose';
import Feedback from '../models/Feedback.js';

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

export async function submitFeedback(userId, { rating, message } = {}) {
  if (!mongoose.isValidObjectId(userId)) {
    throw httpError(400, 'Invalid user id');
  }

  const hasRating = rating !== undefined && rating !== null && rating !== '';
  let parsedRating = null;

  if (hasRating) {
    if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw httpError(422, 'Rating must be an integer between 1 and 5');
    }
    parsedRating = rating;
  }

  let trimmedMessage = '';
  if (message !== undefined && message !== null) {
    if (typeof message !== 'string') {
      throw httpError(422, 'Message must be text');
    }
    trimmedMessage = message.trim();
    if (trimmedMessage.length > 1000) {
      throw httpError(422, 'Message must not exceed 1000 characters');
    }
  }

  if (parsedRating === null && !trimmedMessage) {
    throw httpError(422, 'At least a rating or message is required');
  }

  const feedback = await Feedback.create({
    userId,
    rating: parsedRating,
    message: trimmedMessage,
  });

  return {
    id: String(feedback._id),
    userId: String(feedback.userId),
    rating: feedback.rating,
    message: feedback.message,
    createdAt: feedback.createdAt,
  };
}

export async function listFeedback() {
  const items = await Feedback.find()
    .populate('userId', 'name email role')
    .sort({ createdAt: -1 })
    .lean();

  return items.map((item) => ({
    id: String(item._id),
    userId: String(item.userId?._id || item.userId),
    userName: item.userId?.name || 'Unknown',
    userEmail: item.userId?.email || 'Unknown',
    userRole: item.userId?.role || 'Unknown',
    rating: item.rating,
    message: item.message,
    createdAt: item.createdAt,
  }));
}
