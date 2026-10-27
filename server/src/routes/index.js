import { Router } from 'express';
import healthRouter from './health.js';
import authRouter from './auth.js';
import attemptsRouter from './attempts.js';
import quizAuthoringRouter from './quizAuthoring.js';
import quizzesRouter from './quizzes.js';

const router = Router();

router.use('/health', healthRouter);
router.use('/auth', authRouter);
router.use('/quizzes', quizzesRouter);
router.use(attemptsRouter); // POST /quizzes/:quizId/attempts, PATCH /attempts/:attemptId/answers
router.use(quizAuthoringRouter); // POST/PATCH/DELETE /quizzes, GET /manage/quizzes

export default router;
