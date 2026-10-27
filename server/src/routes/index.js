import { Router } from 'express';
import healthRouter from './health.js';
import authRouter from './auth.js';
import rolesRouter from './roles.js';

const router = Router();

router.use('/health', healthRouter);
router.use('/auth', authRouter);
router.use('/roles', rolesRouter);

export default router;
