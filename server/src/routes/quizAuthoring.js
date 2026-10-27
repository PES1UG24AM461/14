import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import {
  createQuiz,
  deleteQuiz,
  getManagedQuiz,
  listManageableQuizzes,
  updateQuiz,
} from '../services/quizAuthoring.js';

// FR-004: quiz authoring is for faculty and administrators only.
function requireStaff(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (!['faculty', 'administrator'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Faculty or administrators only' });
  }
  return next();
}

const handle = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (err) {
    next(err);
  }
};

// `authenticate` (OQS-05) sets req.user; tests may pass a stand-in.
export function createQuizAuthoringRouter(auth = authenticate) {
  const router = Router();
  const staff = [auth, requireStaff];

  // GET /api/manage/quizzes - quizzes the caller may manage, including drafts (SAD 4.3)
  router.get(
    '/manage/quizzes',
    staff,
    handle(async (req, res) => res.json({ quizzes: await listManageableQuizzes(req.user) }))
  );

  // GET /api/manage/quizzes/:quizId - one quiz with its questions and correct options, for editing
  router.get(
    '/manage/quizzes/:quizId',
    staff,
    handle(async (req, res) =>
      res.json({ quiz: await getManagedQuiz(req.user, req.params.quizId) })
    )
  );

  // POST /api/quizzes - create a draft quiz (SAD 4.3, FR-008, FR-009)
  router.post(
    '/quizzes',
    staff,
    handle(async (req, res) => res.status(201).json({ quiz: await createQuiz(req.user, req.body) }))
  );

  // PATCH /api/quizzes/:quizId - edit a draft quiz (SAD 4.3, FR-010)
  router.patch(
    '/quizzes/:quizId',
    staff,
    handle(async (req, res) =>
      res.json({ quiz: await updateQuiz(req.user, req.params.quizId, req.body) })
    )
  );

  // DELETE /api/quizzes/:quizId - delete a draft quiz (SAD 4.3, FR-010)
  router.delete(
    '/quizzes/:quizId',
    staff,
    handle(async (req, res) => {
      await deleteQuiz(req.user, req.params.quizId);
      res.status(204).end();
    })
  );

  return router;
}

export default createQuizAuthoringRouter();
