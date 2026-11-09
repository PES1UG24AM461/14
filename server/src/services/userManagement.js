import mongoose from 'mongoose';
import User from '../models/User.js';

const VALID_ROLES = ['student', 'faculty', 'administrator'];

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// FR-026: List users with safe fields only for role management (SAD 4.3).
export async function listUsers() {
  const users = await User.find()
    .select('name email role createdAt')
    .sort({ createdAt: -1 })
    .lean();

  return users.map((u) => ({
    id: String(u._id),
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt,
  }));
}

// FR-026: Change a user's role through a protected operation (SAD 4.3).
export async function updateUserRole(userId, newRole) {
  if (!mongoose.isValidObjectId(userId)) {
    throw httpError(400, 'Invalid user id');
  }

  if (!newRole || typeof newRole !== 'string' || !VALID_ROLES.includes(newRole)) {
    throw httpError(422, 'Role must be one of: student, faculty, administrator');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw httpError(404, 'User not found');
  }

  user.role = newRole;
  await user.save();

  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}
