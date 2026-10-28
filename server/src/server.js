import 'dotenv/config';
import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { config } from './config/env.js';
import { finalizeExpiredAttempts } from './services/attempts.js';

const EXPIRY_SWEEP_MS = 60 * 1000;

async function start() {
  await connectDB(config.mongodbUri);
  createApp().listen(config.port, () => {
    console.log(`API listening on http://localhost:${config.port}/api`);
  });
  // FR-017: finalize attempts whose deadline has passed even if the student never returns.
  setInterval(() => {
    finalizeExpiredAttempts().catch((err) => console.error(err.message));
  }, EXPIRY_SWEEP_MS);
}

start().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
