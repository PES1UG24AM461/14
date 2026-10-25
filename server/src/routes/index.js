import { Router } from 'express';
import healthRouter from './health.js';

// Mount feature routers here, following the API paths in SAD section 4.3, e.g.
//   router.use('/auth', authRouter);        // OQS-04, OQS-05
//   router.use('/quizzes', quizRouter);     // OQS-07, OQS-08, OQS-10
//   router.use('/attempts', attemptRouter); // OQS-11, OQS-12
const router = Router();

router.use('/health', healthRouter);

export default router;
