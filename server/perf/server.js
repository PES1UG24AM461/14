// OQS-23 load-test target: the real API on an in-memory MongoDB with seeded data, so a load test never
// touches the shared database. Run from the server folder:
//   PERF_PASSWORD=<any 8+ chars> node perf/server.js
// Then, in another terminal: k6 run -e PERF_PASSWORD=<same> ../perf/load-test.js
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

const STUDENTS = 50;
const QUIZZES = 100;
const QUESTIONS = 5;
const PORT = Number(process.env.PERF_PORT) || 5055;

const password = process.env.PERF_PASSWORD;
if (!password || password.length < 8) {
  console.error('Set PERF_PASSWORD (8 or more characters) for the seeded load-test accounts.');
  process.exit(1);
}
process.env.JWT_SECRET ||= randomBytes(32).toString('hex');
process.env.JWT_EXPIRES_IN = '2h';

const mongod = await MongoMemoryServer.create();
process.env.MONGODB_URI = mongod.getUri();

// Imported after the environment is set, because config/env.js reads it on load.
const { createApp } = await import('../src/app.js');
const { config } = await import('../src/config/env.js');
const { default: User } = await import('../src/models/User.js');
const { default: Quiz } = await import('../src/models/Quiz.js');
const { default: Question } = await import('../src/models/Question.js');
const { default: Attempt } = await import('../src/models/Attempt.js');

await mongoose.connect(config.mongodbUri);
await Promise.all([User.init(), Quiz.init(), Question.init(), Attempt.init()]);

// Same bcrypt cost as registration (12), so login timings are realistic.
const passwordHash = await bcrypt.hash(password, 12);
const faculty = await User.create({
  name: 'Perf Faculty',
  email: 'perf.faculty@example.test',
  passwordHash,
  role: 'faculty',
});
await User.insertMany(
  Array.from({ length: STUDENTS }, (_, i) => ({
    name: `Perf Student ${i + 1}`,
    email: `perf.student${i + 1}@example.test`,
    passwordHash,
    role: 'student',
  }))
);
const quizzes = await Quiz.insertMany(
  Array.from({ length: QUIZZES }, (_, i) => ({
    title: `Load Test Quiz ${i + 1}`,
    topic: `Topic ${(i % 5) + 1}`,
    durationSeconds: 600,
    status: 'published',
    createdBy: faculty._id,
  }))
);
await Question.insertMany(
  quizzes.flatMap((quiz) =>
    Array.from({ length: QUESTIONS }, (_, n) => ({
      quizId: quiz._id,
      prompt: `Question ${n + 1}`,
      options: ['a', 'b', 'c', 'd'],
      correctOption: n % 4,
    }))
  )
);

createApp().listen(PORT, () => {
  console.log(
    `Load-test API ready on http://localhost:${PORT}/api (${STUDENTS} students, ${QUIZZES} quizzes)`
  );
});

const stop = async () => {
  await mongoose.disconnect();
  await mongod.stop();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
