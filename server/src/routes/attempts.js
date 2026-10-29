
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import {
  getAttemptResult,
  saveAnswers,
  startOrResumeAttempt,
  submitAttempt,
} from '../services/attempts.js';

function requireStudent(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'student') {
    return res.status(403).json({ error: 'Students only' });
  }

  return next();
}

// `authenticate` sets req.user = { id, name, email, role }.
export function createAttemptsRouter(auth = authenticate) {
  const router = Router();

  // POST /api/quizzes/:quizId/attempts - start or resume an attempt (FR-013)
  router.post('/quizzes/:quizId/attempts', auth, requireStudent, async (req, res, next) => {
    try {
      const { created, ...body } = await startOrResumeAttempt(req.user.id, req.params.quizId);
      return res.status(created ? 201 : 200).json(body);
    } catch (err) {
      return next(err);
    }
  });

  // PATCH /api/attempts/:attemptId/answers - save answers (FR-015)
  router.patch('/attempts/:attemptId/answers', auth, requireStudent, async (req, res, next) => {
    try {
      const attempt = await saveAnswers(req.user.id, req.params.attemptId, req.body?.answers);
      return res.status(200).json({ attempt });
    } catch (err) {
      return next(err);
    }
  });

  // POST /api/attempts/:attemptId/submit - submit and score an attempt (FR-016, FR-019)
  router.post('/attempts/:attemptId/submit', auth, requireStudent, async (req, res, next) => {
    try {
      const attempt = await submitAttempt(req.user.id, req.params.attemptId);

      return res.status(200).json({
        result: {
          attemptId: String(attempt._id),
          quizId: String(attempt.quizId),
          status: attempt.status,
          score: attempt.score,
          submittedAt: attempt.submittedAt,
        },
      });
    } catch (err) {
      return next(err);
    }
  });

  // GET /api/attempts/:attemptId/result - retrieve a submitted result (FR-020)
  router.get('/attempts/:attemptId/result', auth, requireStudent, async (req, res, next) => {
    try {
      const result = await getAttemptResult(req.user.id, req.params.attemptId);
      return res.status(200).json({ result });
    } catch (err) {
      return next(err);
    }
  });

  return router;
}

export default createAttemptsRouter();
