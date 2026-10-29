
import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { errorHandler } from '../src/middleware/errorHandler.js';
import Attempt from '../src/models/Attempt.js';
import Question from '../src/models/Question.js';
import Quiz from '../src/models/Quiz.js';
import { createApp } from '../src/app.js';
import { createAttemptsRouter } from '../src/routes/attempts.js';
import { clearTestDB, closeTestDB, connectTestDB } from './helpers/db.js';

// Stand-in for the real authenticate middleware so most tests can pick the user with headers.
function fakeAuth(req, _res, next) {
  if (req.get('x-test-user')) {
    req.user = {
      id: req.get('x-test-user'),
      role: req.get('x-test-role') || 'student',
    };
  }
  next();
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', createAttemptsRouter(fakeAuth));
  app.use(errorHandler);
  return app;
}

const app = buildApp();
const studentA = new mongoose.Types.ObjectId().toString();
const studentB = new mongoose.Types.ObjectId().toString();

const as = (user, role) => ({
  'x-test-user': user,
  ...(role ? { 'x-test-role': role } : {}),
});

async function seedQuiz({ status = 'published', durationSeconds = 600 } = {}) {
  const quiz = await Quiz.create({
    title: 'JavaScript Basics',
    topic: 'Programming',
    durationSeconds,
    status,
    createdBy: new mongoose.Types.ObjectId(),
  });

  const questions = await Question.insertMany(
    [0, 1, 2].map((n) => ({
      quizId: quiz._id,
      prompt: `Q${n + 1}`,
      options: ['a', 'b', 'c', 'd'],
      correctOption: n,
    }))
  );

  return { quiz, questions };
}

const start = (quizId, user = studentA) =>
  request(app).post(`/api/quizzes/${quizId}/attempts`).set(as(user));

const save = (attemptId, answers, user = studentA) =>
  request(app)
    .patch(`/api/attempts/${attemptId}/answers`)
    .set(as(user))
    .send({ answers });

const submit = (attemptId, user = studentA) =>
  request(app).post(`/api/attempts/${attemptId}/submit`).set(as(user));

const getResult = (attemptId, user = studentA) =>
  request(app).get(`/api/attempts/${attemptId}/result`).set(as(user));

describe('OQS-11: start or resume an attempt and save answers', () => {
  beforeAll(async () => {
    await connectTestDB();
    await Attempt.init();
  });

  afterEach(clearTestDB);
  afterAll(closeTestDB);

  it('TC-ATT-01 starts an attempt with a server deadline and returns the questions', async () => {
    const { quiz } = await seedQuiz({ durationSeconds: 600 });
    const before = Date.now();
    const res = await start(quiz._id);

    expect(res.status).toBe(201);
    expect(res.body.attempt.status).toBe('in_progress');

    const started = new Date(res.body.attempt.startedAt).getTime();

    expect(started).toBeGreaterThanOrEqual(before - 1000);
    expect(new Date(res.body.attempt.deadlineAt).getTime() - started).toBe(600 * 1000);
    expect(res.body.questions).toHaveLength(3);
    expect(Object.keys(res.body.questions[0]).sort()).toEqual(['id', 'options', 'prompt']);
  });

  it('TC-SCR-04 never sends the correct option when an attempt starts', async () => {
    const { quiz } = await seedQuiz();
    const res = await start(quiz._id);

    expect(JSON.stringify(res.body)).not.toMatch(/correctOption|score|explanation/i);
  });

  it('TC-ATT-14 resumes the active attempt with saved answers and the original deadline', async () => {
    const { quiz, questions } = await seedQuiz();
    const first = await start(quiz._id);

    await save(first.body.attempt.id, [
      { questionId: String(questions[0]._id), selectedOption: 2 },
    ]);

    const again = await start(quiz._id);

    expect(again.status).toBe(200);
    expect(again.body.attempt.id).toBe(first.body.attempt.id);
    expect(again.body.attempt.deadlineAt).toBe(first.body.attempt.deadlineAt);
    expect(again.body.attempt.answers).toEqual([
      { questionId: String(questions[0]._id), selectedOption: 2 },
    ]);
    expect(await Attempt.countDocuments()).toBe(1);
  });

  it('TC-ATT-02 blocks starting again once the attempt is finalized (409)', async () => {
    const { quiz } = await seedQuiz();
    const first = await start(quiz._id);

    await Attempt.updateOne(
      { _id: first.body.attempt.id },
      { status: 'finalized', submittedAt: new Date() }
    );

    const again = await start(quiz._id);

    expect(again.status).toBe(409);
    expect(await Attempt.countDocuments()).toBe(1);
  });

  it('TC-ATT-13 creates exactly one attempt for five simultaneous start requests', async () => {
    const { quiz } = await seedQuiz();
    const results = await Promise.all([1, 2, 3, 4, 5].map(() => start(quiz._id)));

    expect(results.every((r) => [200, 201].includes(r.status))).toBe(true);
    expect(new Set(results.map((r) => r.body.attempt.id)).size).toBe(1);
    expect(await Attempt.countDocuments({ quizId: quiz._id })).toBe(1);
  });

  it('TC-ATT-03 does not start an attempt on a draft quiz', async () => {
    const { quiz } = await seedQuiz({ status: 'draft' });
    const res = await start(quiz._id);

    expect(res.status).toBe(404);
    expect(await Attempt.countDocuments()).toBe(0);
  });

  it('TC-ATT-05 keeps saved answers and replaces an answer that is changed', async () => {
    const { quiz, questions } = await seedQuiz();
    const { body } = await start(quiz._id);
    const [q1, q2] = questions.map((q) => String(q._id));

    await save(body.attempt.id, [{ questionId: q1, selectedOption: 0 }]);

    const res = await save(body.attempt.id, [
      { questionId: q1, selectedOption: 3 },
      { questionId: q2, selectedOption: 1 },
    ]);

    expect(res.status).toBe(200);
    expect(res.body.attempt.answers).toEqual([
      { questionId: q1, selectedOption: 3 },
      { questionId: q2, selectedOption: 1 },
    ]);
  });

  it('TC-ATT-12 rejects saving answers after the server deadline', async () => {
    const { quiz, questions } = await seedQuiz();
    const { body } = await start(quiz._id);

    await Attempt.updateOne(
      { _id: body.attempt.id },
      { deadlineAt: new Date(Date.now() - 1000) }
    );

    const res = await save(body.attempt.id, [
      { questionId: String(questions[0]._id), selectedOption: 1 },
    ]);

    expect(res.status).toBe(409);
    expect((await Attempt.findById(body.attempt.id)).answers).toHaveLength(0);
  });

  it("rejects saving answers to another student's attempt (403)", async () => {
    const { quiz, questions } = await seedQuiz();
    const { body } = await start(quiz._id, studentA);

    const res = await save(
      body.attempt.id,
      [{ questionId: String(questions[0]._id), selectedOption: 1 }],
      studentB
    );

    expect(res.status).toBe(403);
  });

  it('TC-SEC-04 rejects answers for unknown questions or out-of-range options (422)', async () => {
    const { quiz, questions } = await seedQuiz();
    const { body } = await start(quiz._id);
    const other = new mongoose.Types.ObjectId().toString();

    expect(
      (await save(body.attempt.id, [{ questionId: other, selectedOption: 0 }])).status
    ).toBe(422);

    expect(
      (
        await save(body.attempt.id, [
          { questionId: String(questions[0]._id), selectedOption: 9 },
        ])
      ).status
    ).toBe(422);

    expect((await save(body.attempt.id, 'not-a-list')).status).toBe(422);

    expect(
      (await request(app).patch('/api/attempts/bad-id/answers').set(as(studentA)).send({})).status
    ).toBe(400);
  });

  it('requires a logged-in student (401 without login, 403 for faculty)', async () => {
    const { quiz } = await seedQuiz();

    expect((await request(app).post(`/api/quizzes/${quiz._id}/attempts`)).status).toBe(401);

    expect(
      (await request(app).post(`/api/quizzes/${quiz._id}/attempts`).set(as(studentA, 'faculty')))
        .status
    ).toBe(403);
  });

  it('TC-AUTH-06 works end to end with real login, and the token stops working after logout', async () => {
    const realApp = createApp();
    const { quiz } = await seedQuiz();

    const student = {
      name: 'Asha Student',
      email: 'asha@example.com',
      password: 'SecurePass123',
    };

    await request(realApp).post('/api/auth/register').send(student);

    const login = await request(realApp)
      .post('/api/auth/login')
      .send({ email: student.email, password: student.password });

    const auth = { Authorization: `Bearer ${login.body.token}` };

    const started = await request(realApp).post(`/api/quizzes/${quiz._id}/attempts`).set(auth);

    expect(started.status).toBe(201);
    expect(started.body.questions).toHaveLength(3);

    await request(realApp).post('/api/auth/logout').set(auth);

    const afterLogout = await request(realApp)
      .post(`/api/quizzes/${quiz._id}/attempts`)
      .set(auth);

    expect(afterLogout.status).toBe(401);
  });
});

describe('OQS-12: submit attempt and automatic scoring', () => {
  beforeAll(async () => {
    await connectTestDB();
    await Attempt.init();
  });

  afterEach(clearTestDB);
  afterAll(closeTestDB);

  it('TC-ATT-17 retrieves a submitted result only for its owner', async () => {
    const { quiz, questions } = await seedQuiz();
    const started = await start(quiz._id);

    await save(started.body.attempt.id, [
      { questionId: String(questions[0]._id), selectedOption: 0 },
    ]);

    await submit(started.body.attempt.id);

    const result = await getResult(started.body.attempt.id);
    const otherStudent = await getResult(started.body.attempt.id, studentB);

    expect(result.status).toBe(200);
    expect(result.body.result.score).toBe(1);
    expect(result.body.result.status).toBe('finalized');
    expect(otherStudent.status).toBe(403);
  });

  it('TC-ATT-15 submits an attempt and calculates the score on the server', async () => {
    const { quiz, questions } = await seedQuiz();
    const started = await start(quiz._id);

    await save(started.body.attempt.id, [
      { questionId: String(questions[0]._id), selectedOption: 0 },
      { questionId: String(questions[1]._id), selectedOption: 2 },
      { questionId: String(questions[2]._id), selectedOption: 2 },
    ]);

    const res = await submit(started.body.attempt.id);

    expect(res.status).toBe(200);
    expect(res.body.result.status).toBe('finalized');
    expect(res.body.result.score).toBe(2);

    const stored = await Attempt.findById(started.body.attempt.id);

    expect(stored.status).toBe('finalized');
    expect(stored.score).toBe(2);
    expect(stored.submittedAt).toBeTruthy();
  });

  it('TC-ATT-16 returns the stored result when the attempt is submitted twice', async () => {
    const { quiz, questions } = await seedQuiz();
    const started = await start(quiz._id);

    await save(started.body.attempt.id, [
      { questionId: String(questions[0]._id), selectedOption: 0 },
    ]);

    const first = await submit(started.body.attempt.id);
    const second = await submit(started.body.attempt.id);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body.result.score).toBe(first.body.result.score);
    expect(second.body.result.submittedAt).toBe(first.body.result.submittedAt);
  });

  it("rejects submission of another student's attempt", async () => {
    const { quiz } = await seedQuiz();
    const started = await start(quiz._id, studentA);

    const res = await submit(started.body.attempt.id, studentB);

    expect(res.status).toBe(403);
  });

  it('requires an authenticated student to submit an attempt', async () => {
    const { quiz } = await seedQuiz();
    const started = await start(quiz._id);

    const unauthenticated = await request(app).post(
      `/api/attempts/${started.body.attempt.id}/submit`
    );

    const faculty = await request(app)
      .post(`/api/attempts/${started.body.attempt.id}/submit`)
      .set(as(studentA, 'faculty'));

    expect(unauthenticated.status).toBe(401);
    expect(faculty.status).toBe(403);
  });
});
