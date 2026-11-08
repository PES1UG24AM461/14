// Middleware to validate a MongoDB ObjectId passed as a URL parameter.
// Usage: router.get('/:quizId', validateObjectIdParam('quizId'), handler)
// If the param is missing or not a valid 24‑hex ObjectId, responds with 400.
import mongoose from 'mongoose';

export function validateObjectIdParam(paramName = 'id') {
  return (req, res, next) => {
    const value = req.params[paramName];
    if (!value || !mongoose.isValidObjectId(value)) {
      return res.status(400).json({ error: `Invalid ${paramName} id` });
    }
    return next();
  };
}
