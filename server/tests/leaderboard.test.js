import bcrypt from 'bcryptjs';
import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import Attempt from '../src/models/Attempt.js';
import Question from '../src/models/Question.js';
import Quiz from '../src/models/Quiz.js';
import User from '../src/models/User.js';
import { createLeaderboardRouter } from '../src/routes/leaderboard.js';
import { clearTestDB, closeTestDB, connectTestDB } from './helpers/db.js';

// Stand-in for authenticate so tests can choose the viewer with headers.
function fakeAuth(req, _res, next) {
  if (req.get('x-test-user')) {
    req.user = { id: req.get('x-test-user'), role: req.get('x-test-role') || 'student' };
  }
  next();
}

const app = express();
app.use(express.json());
app.use('/api', createLeaderboardRouter(fakeAuth));
app.use(errorHandler);

const viewer = new mongoose.Types.ObjectId().toString();
const asStudent = { 'x-test-user': viewer, 'x-test-role': 'student' };
const asFaculty = { 'x-test-user': viewer, 'x-test-role': 'faculty' };
const board = (quizId, headers = asStudent) =>
  request(app).get(`/api/quizzes/${quizId}/leaderboard`).set(headers);

async function seedQuiz(title, status = 'published') {
  const quiz = await Quiz.create({
    title,
    topic: 'Programming',
    durationSeconds: 600,
    status,
    createdBy: new mongoose.Types.ObjectId(),
  });
  await Question.insertMany(
    [0, 1, 2, 3, 4].map((n) => ({
      quizId: quiz._id,
      prompt: `Q${n + 1}`,
      options: ['a', 'b'],
      correctOption: 0,
    }))
  );
  return quiz;
}

let counter = 0;
async function seedAttempt(quiz, { name, score, submittedAt, status = 'finalized', userId }) {
  counter += 1;
  const user = userId
    ? { _id: userId }
    : await User.create({
        name,
        email: `student${counter}@example.com`,
        passwordHash: 'not-a-real-hash',
        role: 'student',
      });
  const startedAt = new Date(submittedAt.getTime() - 60_000);
  return Attempt.create({
    userId: user._id,
    quizId: quiz._id,
    score: status === 'finalized' ? score : null,
    status,
    startedAt,
    deadlineAt: new Date(startedAt.getTime() + 600_000),
    submittedAt: status === 'finalized' ? submittedAt : null,
  });
}

const at = (minute) => new Date(Date.UTC(2026, 10, 1, 10, minute));

describe('OQS-17: per-quiz leaderboard with deterministic tie-break', () => {
  beforeAll(async () => {
    await connectTestDB();
    await Promise.all([Attempt.init(), User.init()]);
  });

  afterEach(clearTestDB);
  afterAll(closeTestDB);

  it('TC-LB-01 each leaderboard contains only attempts for its own quiz', async () => {
    const js = await seedQuiz('JavaScript Basics');
    const css = await seedQuiz('CSS Basics');
    await seedAttempt(js, { name: 'Asha', score: 3, submittedAt: at(1) });
    await seedAttempt(js, { name: 'Ravi', score: 4, submittedAt: at(2) });
    await seedAttempt(css, { name: 'Meera', score: 5, submittedAt: at(3) });

    const jsBoard = await board(js._id);
    const cssBoard = await board(css._id);

    expect(jsBoard.status).toBe(200);
    expect(jsBoard.body.quiz).toMatchObject({ title: 'JavaScript Basics', questionCount: 5 });
    expect(jsBoard.body.entries.map((e) => e.name)).toEqual(['Ravi', 'Asha']);
    expect(cssBoard.body.entries.map((e) => e.name)).toEqual(['Meera']);
  });

  it('TC-LB-01 leaves out attempts that are still in progress', async () => {
    const quiz = await seedQuiz('JavaScript Basics');
    await seedAttempt(quiz, { name: 'Asha', score: 2, submittedAt: at(1) });
    await seedAttempt(quiz, { name: 'Ravi', submittedAt: at(2), status: 'in_progress' });

    const res = await board(quiz._id);

    expect(res.body.entries.map((e) => e.name)).toEqual(['Asha']);
  });

  it('TC-LB-02 orders entries by score, highest first, with ranks 1..n', async () => {
    const quiz = await seedQuiz('JavaScript Basics');
    await seedAttempt(quiz, { name: 'Four', score: 4, submittedAt: at(1) });
    await seedAttempt(quiz, { name: 'Two', score: 2, submittedAt: at(2) });
    await seedAttempt(quiz, { name: 'Five', score: 5, submittedAt: at(3) });

    const res = await board(quiz._id);

    expect(res.body.entries.map((e) => [e.rank, e.score])).toEqual([
      [1, 5],
      [2, 4],
      [3, 2],
    ]);
  });

  it('TC-LB-03 ranks the earlier submission higher on equal scores, identically on every load', async () => {
    const quiz = await seedQuiz('JavaScript Basics');
    // Inserted in the "wrong" order on purpose so the result cannot depend on insertion order.
    await seedAttempt(quiz, { name: 'Later', score: 3, submittedAt: at(9) });
    await seedAttempt(quiz, { name: 'Earlier', score: 3, submittedAt: at(4) });
    await seedAttempt(quiz, { name: 'Top', score: 5, submittedAt: at(20) });

    const loads = await Promise.all([1, 2, 3, 4, 5].map(() => board(quiz._id)));
    const orders = loads.map((r) => r.body.entries.map((e) => e.name).join(','));

    expect(orders[0]).toBe('Top,Earlier,Later');
    expect(new Set(orders).size).toBe(1);
  });

  it('marks the viewer’s own entry and shows names only, never email addresses', async () => {
    const quiz = await seedQuiz('JavaScript Basics');
    const me = await User.create({
      name: 'Viewer',
      email: 'viewer@example.com',
      passwordHash: 'not-a-real-hash',
      role: 'student',
    });
    await seedAttempt(quiz, { userId: me._id, score: 1, submittedAt: at(1) });
    await seedAttempt(quiz, { name: 'Other', score: 4, submittedAt: at(2) });

    const res = await board(quiz._id, { 'x-test-user': String(me._id) });

    expect(res.body.entries.map((e) => [e.name, e.isMe])).toEqual([
      ['Other', false],
      ['Viewer', true],
    ]);
    expect(JSON.stringify(res.body)).not.toContain('@example.com');
    expect(Object.keys(res.body.entries[0]).sort()).toEqual([
      'isMe',
      'name',
      'rank',
      'score',
      'submittedAt',
    ]);
  });

  it('returns an empty list for a quiz nobody has finished yet', async () => {
    const quiz = await seedQuiz('JavaScript Basics');

    const res = await board(quiz._id);

    expect(res.status).toBe(200);
    expect(res.body.entries).toEqual([]);
  });

  it('hides draft quizzes from students but shows them to faculty', async () => {
    const draft = await seedQuiz('Draft quiz', 'draft');

    expect((await board(draft._id)).status).toBe(404);
    expect((await board(draft._id, asFaculty)).status).toBe(200);
  });

  it('returns 404 for an unknown quiz and 400 for a malformed id', async () => {
    const missing = await board(new mongoose.Types.ObjectId());
    const malformed = await board('not-an-id');

    expect(missing.status).toBe(404);
    expect(malformed.status).toBe(400);
    expect(malformed.body.error).toBe('Invalid quiz id');
  });

  it('requires a logged-in user (401 without a token through the real app)', async () => {
    const quiz = await seedQuiz('JavaScript Basics');

    const res = await request(createApp()).get(`/api/quizzes/${quiz._id}/leaderboard`);

    expect(res.status).toBe(401);
  });

  it('works end to end with a real login token', async () => {
    const quiz = await seedQuiz('JavaScript Basics');
    const realApp = createApp();
    await User.create({
      name: 'Real Student',
      email: 'real@example.com',
      passwordHash: await bcrypt.hash('Correct-Horse-1', 4),
      role: 'student',
    });
    const login = await request(realApp)
      .post('/api/auth/login')
      .send({ email: 'real@example.com', password: 'Correct-Horse-1' });

    const res = await request(realApp)
      .get(`/api/quizzes/${quiz._id}/leaderboard`)
      .set('Authorization', `Bearer ${login.body.token}`);

    expect(res.status).toBe(200);
    expect(res.body.quiz.title).toBe('JavaScript Basics');
  });
});
