import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

// Any authenticated user can access their own role information.
router.get('/me', authenticate, (req, res) => {
  return res.status(200).json({
    user: req.user,
  });
});

// Only faculty and administrators can access this endpoint.
router.get('/quiz-management', authenticate, authorize('faculty', 'administrator'), (req, res) => {
  return res.status(200).json({
    message: 'Access granted to quiz management',
    role: req.user.role,
  });
});

// Only administrators can access this endpoint.
router.get('/administration', authenticate, authorize('administrator'), (req, res) => {
  return res.status(200).json({
    message: 'Access granted to administration',
    role: req.user.role,
  });
});

export default router;
