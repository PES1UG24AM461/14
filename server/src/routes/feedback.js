import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { listFeedback, submitFeedback } from '../services/feedback.js';

export function createFeedbackRouter(auth = authenticate, adminAuth = authorize('administrator')) {
  const router = Router();

  // POST /api/feedback - submit feedback (FR-024, TC-FB-01, TC-FB-02, TC-FB-03)
  router.post('/feedback', auth, async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      const feedback = await submitFeedback(req.user.id, req.body || {});
      return res.status(201).json({ feedback });
    } catch (err) {
      return next(err);
    }
  });

  // GET /api/admin/feedback - administrator feedback review (FR-025, TC-ADM-01, TC-ADM-02)
  router.get('/admin/feedback', auth, adminAuth, async (_req, res, next) => {
    try {
      const feedback = await listFeedback();
      return res.status(200).json({ feedback });
    } catch (err) {
      return next(err);
    }
  });

  return router;
}

export default createFeedbackRouter();
