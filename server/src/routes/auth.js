import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body ?? {};

    if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        error: 'Name, email and password are required',
      });
    }

    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedName.length < 2 || normalizedName.length > 100) {
      return res.status(400).json({
        error: 'Name must contain between 2 and 100 characters',
      });
    }

    if (normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ error: 'A valid email is required' });
    }

    if (password.length < 8 || password.length > 128) {
      return res.status(400).json({
        error: 'Password must contain between 8 and 128 characters',
      });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({ error: 'Email is already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      passwordHash,
      role: 'student',
    });

    return res.status(201).json({
      message: 'Registration successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Email is already registered' });
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: 'Invalid registration details' });
    }

    return next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};

    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      return res.status(400).json({
        error: 'Email and password are required',
      });
    }

    if (!config.jwtSecret) {
      return res.status(503).json({
        error: 'Authentication is temporarily unavailable',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    }).select('+passwordHash');

    // Use the same response for unknown emails and incorrect passwords.
    const passwordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false;

    if (!user || !passwordMatches) {
      return res.status(401).json({
        error: 'Invalid email or password',
      });
    }

    const token = jwt.sign(
      {
        sub: user._id.toString(),
        tokenVersion: user.tokenVersion,
      },
      config.jwtSecret,
      {
        expiresIn: config.jwtExpiresIn,
      }
    );

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/logout', authenticate, async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { tokenVersion: 1 },
    });

    return res.status(200).json({
      message: 'Logout successful',
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
