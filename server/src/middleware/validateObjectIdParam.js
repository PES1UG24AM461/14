import mongoose from 'mongoose';

export function validateObjectIdParam(paramName) {
  return (req, res, next) => {
    const value = req.params[paramName];

    if (!mongoose.isValidObjectId(value)) {
      const label = paramName.replace(/Id$/, '');
      return res.status(400).json({ error: `Invalid ${label} id` });
    }

    next();
  };
}
