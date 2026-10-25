import cors from 'cors';
import express from 'express';
import { config } from './config/env.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import apiRouter from './routes/index.js';

// The Express app is created separately from server.js so tests can import it without a database.
export function createApp() {
  const app = express();
  app.use(cors({ origin: config.clientOrigin }));
  app.use(express.json({ limit: '100kb' }));
  app.use('/api', apiRouter);
  app.use('/api', notFound);
  app.use(errorHandler);
  return app;
}

export default createApp;
