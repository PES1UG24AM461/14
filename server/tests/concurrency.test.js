import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { errorHandler } from '../src/middleware/errorHandler.js';
import Attempt from '../src/models/Attempt.js';
import Question from '../src/models/Question.js';
import Quiz from '../src/models/Quiz.js';
import { createAttemptsRouter } from '../src/routes/attempts.js';
import { clearTestDB, closeTestDB, connectTestDB } from './helpers/db.js';

// OQS-23: duplicate-submit safety under concurrency (NFR-002) and the indexes behind NFR-001.
function fakeAuth(req, _res, next) {
  if (req.get('x-test-user')) req.user = { id: req.get('x-test-user'), role: 'student' };
  next();
}

const app = express();
app.use(express.json());
app.use('/api', createAttemptsRouter(fakeAuth));
app.use(errorHandler);

const as = (user) => ({ 'x-test-user': user });
const newStudent = () => new mongoose.Types.ObjectId().toString();

async function seedQuiz() {
  const quiz = await Quiz.create({
    title: 'Class Quiz',
    topic: 'Programming',
    durationSeconds: 600,
    status: 'published',
    createdBy: new mongoose.Types.ObjectId(),
  });
  const questions = await Question.insertMany(
    [0, 1, 2].map((n) => ({
      quizId: quiz._id,
      prompt: `Q${n + 1}`,
      options: ['a', 'b', 'c'],
      correctOption: n,
    }))
  );
  return { quiz, questions };
}

async function startAndAnswer(quiz, questions, student, correctCount) {
  const started = await request(app).post(`/api/quizzes/${quiz._id}/attempts`).set(as(student));
  const answers = questions.map((q, i) => ({
    questionId: String(q._id),
    selectedOption: i < correctCount ? i : (i + 1) % 3,
  }));
  await request(app)
    .patch(`/api/attempts/${started.body.attempt.id}/answers`)
    .set(as(student))
    .send({ answers });
  return started.body.attempt.id;
}

const submit = (attemptId, student) =>
  request(app).post(`/api/attempts/${attemptId}/submit`).set(as(student));

describe('OQS-23: performance and concurrency', () => {
  beforeAll(async () => {
    await connectTestDB();
    await Promise.all([Attempt.init(), Question.init()]);
  });

  afterEach(clearTestDB);
  afterAll(closeTestDB);

  it('TC-ATT-07 five simultaneous submits of one attempt store exactly one final result', async () => {
    const { quiz, questions } = await seedQuiz();
    const student = newStudent();
    const attemptId = await startAndAnswer(quiz, questions, student, 2);

    const results = await Promise.all([1, 2, 3, 4, 5].map(() => submit(attemptId, student)));

    expect(results.map((r) => r.status)).toEqual([200, 200, 200, 200, 200]);
    expect(new Set(results.map((r) => r.body.result.score))).toEqual(new Set([2]));
    expect(new Set(results.map((r) => r.body.result.submittedAt)).size).toBe(1);
    const stored = await Attempt.find({ quizId: quiz._id });
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ status: 'finalized', score: 2 });
  });

  it('TC-PERF-02 50 students submitting the same quiz at the same moment each get exactly one finalized attempt', async () => {
    const { quiz, questions } = await seedQuiz();
    const students = Array.from({ length: 50 }, newStudent);
    const attemptIds = await Promise.all(
      students.map((s, i) => startAndAnswer(quiz, questions, s, i % 4))
    );

    // Everyone submits at once, and every student double-clicks Submit.
    const responses = await Promise.all(
      students.flatMap((s, i) => [submit(attemptIds[i], s), submit(attemptIds[i], s)])
    );

    expect(responses.every((r) => r.status === 200)).toBe(true);
    const stored = await Attempt.find({ quizId: quiz._id }).lean();
    expect(stored).toHaveLength(50);
    expect(stored.every((a) => a.status === 'finalized')).toBe(true);
    expect(new Set(stored.map((a) => String(a.userId))).size).toBe(50);
    for (const [i, s] of students.entries()) {
      const mine = stored.find((a) => String(a.userId) === s);
      expect(mine.score).toBe(Math.min(i % 4, 3));
    }
  });

  it('TC-PERF-01 the collections have the indexes the hot queries rely on (SAD 5: NFR-001)', async () => {
    const questionIndexes = await Question.collection.indexes();
    const attemptIndexes = await Attempt.collection.indexes();
    const keys = (list) => list.map((i) => JSON.stringify(i.key));

    expect(keys(questionIndexes)).toContain(JSON.stringify({ quizId: 1 }));
    const unique = attemptIndexes.find(
      (i) => JSON.stringify(i.key) === JSON.stringify({ userId: 1, quizId: 1 })
    );
    expect(unique?.unique).toBe(true);
    expect(keys(attemptIndexes)).toContain(
      JSON.stringify({ quizId: 1, status: 1, score: -1, submittedAt: 1 })
    );
  });

  it('TC-PERF-01 the leaderboard query uses its index instead of scanning every attempt', async () => {
    const { quiz } = await seedQuiz();
    const plan = await Attempt.find({ quizId: quiz._id, status: 'finalized' })
      .sort({ score: -1, submittedAt: 1, _id: 1 })
      .explain('queryPlanner');
    const text = JSON.stringify(plan);

    expect(text).toContain('IXSCAN');
    expect(text).not.toContain('COLLSCAN');
  });
});
