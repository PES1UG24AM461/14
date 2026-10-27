import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { saveAnswers, startOrResumeAttempt } from '../services/attempts.js';

function requireStudent(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (req.user.role !== 'student') return res.status(403).json({ error: 'Students only' });
  return next();
}

// `authenticate` (OQS-05) sets req.user = { id, name, email, role }; tests may pass a stand-in.
export function createAttemptsRouter(auth = authenticate) {
  const router = Router();

  // POST /api/quizzes/:quizId/attempts - start or resume an attempt (SAD 4.3, FR-013)
  router.post('/quizzes/:quizId/attempts', auth, requireStudent, async (req, res, next) => {
    try {
      const { created, ...body } = await startOrResumeAttempt(req.user.id, req.params.quizId);
      res.status(created ? 201 : 200).json(body);
    } catch (err) {
      next(err);
    }
  });

  // PATCH /api/attempts/:attemptId/answers - save answers while the attempt is active (SAD 4.3, FR-015)
  router.patch('/attempts/:attemptId/answers', auth, requireStudent, async (req, res, next) => {
    try {
      res.json({
        attempt: await saveAnswers(req.user.id, req.params.attemptId, req.body?.answers),
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export default createAttemptsRouter();
