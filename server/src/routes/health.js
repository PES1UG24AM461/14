import { Router } from 'express';
import mongoose from 'mongoose';

const router = Router();

// GET /api/health - liveness check used by developers and CI.
router.get('/', (_req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({ status: 'ok', database: states[mongoose.connection.readyState] || 'unknown' });
});

export default router;
