import { Router } from 'express';
import healthRouter from './health.js';
import authRouter from './auth.js';
import rolesRouter from './roles.js';
import attemptsRouter from './attempts.js';
import quizAuthoringRouter from './quizAuthoring.js';
import quizzesRouter from './quizzes.js';
import userManagementRouter from './userManagement.js';
import feedbackRouter from './feedback.js';

const router = Router();

router.use('/health', healthRouter);
router.use('/auth', authRouter);
router.use('/roles', rolesRouter);
router.use('/quizzes', quizzesRouter);
router.use(attemptsRouter);
router.use(quizAuthoringRouter);
router.use(userManagementRouter);
router.use(feedbackRouter);
export default router;
