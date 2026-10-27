import { Router } from 'express';
import healthRouter from './health.js';
import authRouter from './auth.js';
import quizAuthoringRouter from './quizAuthoring.js';

const router = Router();

router.use('/health', healthRouter);
router.use('/auth', authRouter);
router.use(quizAuthoringRouter); // POST/PATCH/DELETE /quizzes, GET /manage/quizzes

export default router;
