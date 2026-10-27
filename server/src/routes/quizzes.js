import { Router } from 'express';
import { getPublishedQuiz, listPublishedByTopic } from '../services/quizDiscovery.js';

const router = Router();

// GET /api/quizzes - published quizzes grouped by topic (SAD 4.3, FR-005)
router.get('/', async (_req, res, next) => {
  try {
    res.json({ topics: await listPublishedByTopic() });
  } catch (err) {
    next(err);
  }
});

// GET /api/quizzes/:quizId - quiz details without answer keys (SAD 4.3, FR-006, SEC-003)
router.get('/:quizId', async (req, res, next) => {
  try {
    res.json({ quiz: await getPublishedQuiz(req.params.quizId) });
  } catch (err) {
    next(err);
  }
});

export default router;
