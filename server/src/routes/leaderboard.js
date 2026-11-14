import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { getQuizLeaderboard } from '../services/leaderboard.js';

// Per-quiz leaderboard (SAD 4.3, FR-022, FR-023). Any logged-in user can view it.
export function createLeaderboardRouter(auth = authenticate) {
  const router = Router();

  // GET /api/quizzes/:quizId/leaderboard
  router.get('/quizzes/:quizId/leaderboard', auth, async (req, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Authentication required' });
      return res.status(200).json(await getQuizLeaderboard(req.params.quizId, req.user));
    } catch (err) {
      return next(err);
    }
  });

  return router;
}

export default createLeaderboardRouter();
