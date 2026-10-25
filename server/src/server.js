import 'dotenv/config';
import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { config } from './config/env.js';

async function start() {
  await connectDB(config.mongodbUri);
  createApp().listen(config.port, () => {
    console.log(`API listening on http://localhost:${config.port}/api`);
  });
}

start().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
