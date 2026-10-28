import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { errorHandler } from '../src/middleware/errorHandler.js';
import Attempt from '../src/models/Attempt.js';
import Question from '../src/models/Question.js';
import Quiz from '../src/models/Quiz.js';
import { createAttemptsRouter } from '../src/routes/attempts.js';
import {
  finalizeAttempt,
  finalizeExpiredAttempts,
  saveAnswers,
  startOrResumeAttempt,
} from '../src/services/attempts.js';
import { clearTestDB, closeTestDB, connectTestDB } from './helpers/db.js';

// Stand-in for the real authenticate middleware (see attempts.test.js).
function fakeAuth(req, _res, next) {
  if (req.get('x-test-user')) req.user = { id: req.get('x-test-user'), role: 'student' };
  next();
}

const app = express();
app.use(express.json());
app.use('/api', createAttemptsRouter(fakeAuth));
app.use(errorHandler);

const student = new mongoose.Types.ObjectId().toString();

// Three questions; the correct option of question n is n.
async function seedQuiz(durationSeconds = 600) {
  const quiz = await Quiz.create({
    title: 'JavaScript Basics',
    topic: 'Programming',
    durationSeconds,
    status: 'published',
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

const start = (quizId) =>
  request(app).post(`/api/quizzes/${quizId}/attempts`).set('x-test-user', student);
const save = (attemptId, body) =>
  request(app).patch(`/api/attempts/${attemptId}/answers`).set('x-test-user', student).send(body);

// Moves the stored deadline into the past, as if the student had been away until after it.
const expire = (attemptId) =>
  Attempt.updateOne({ _id: attemptId }, { deadlineAt: new Date(Date.now() - 1000) });

describe('OQS-15: server-enforced timer', () => {
  beforeAll(async () => {
    await connectTestDB();
    await Attempt.init();
  });
  afterEach(clearTestDB);
  afterAll(closeTestDB);

  it('TC-ATT-08 finalizes an expired attempt and scores only the answers saved by the deadline', async () => {
    const { quiz, questions } = await seedQuiz();
    const { body } = await start(quiz._id);
    const attemptId = body.attempt.id;
    await save(attemptId, {
      answers: [
        { questionId: questions[0].id, selectedOption: 0 },
        { questionId: questions[1].id, selectedOption: 3 },
      ],
    });
    await expire(attemptId);

    const late = await save(attemptId, {
      answers: [{ questionId: questions[1].id, selectedOption: 1 }],
    });
    expect(late.status).toBe(409);

    const stored = await Attempt.findById(attemptId).lean();
    expect(stored.status).toBe('finalized');
    expect(stored.score).toBe(1);
    expect(stored.submittedAt).toEqual(stored.deadlineAt);
    expect(
      stored.answers.find((a) => String(a.questionId) === questions[1].id).selectedOption
    ).toBe(3);
  });

  it('TC-ATT-08 finalizes an expired attempt when the student comes back to it', async () => {
    const { quiz, questions } = await seedQuiz();
    const { body } = await start(quiz._id);
    await save(body.attempt.id, { answers: [{ questionId: questions[2].id, selectedOption: 2 }] });
    await expire(body.attempt.id);

    const res = await start(quiz._id);

    expect(res.status).toBe(409);
    const stored = await Attempt.findById(body.attempt.id).lean();
    expect(stored).toMatchObject({ status: 'finalized', score: 1 });
  });

  it('TC-ATT-09 rejects answer updates after the attempt is finalized and keeps the score', async () => {
    const { quiz, questions } = await seedQuiz();
    const { body } = await start(quiz._id);
    await save(body.attempt.id, { answers: [{ questionId: questions[0].id, selectedOption: 0 }] });
    await finalizeAttempt(await Attempt.findById(body.attempt.id));

    const res = await save(body.attempt.id, {
      answers: [{ questionId: questions[1].id, selectedOption: 1 }],
    });

    expect(res.status).toBe(409);
    expect(await Attempt.findById(body.attempt.id).lean()).toMatchObject({ score: 1 });
  });

  it('TC-ATT-10 late updates after expiry never change the finalized score', async () => {
    const { quiz, questions } = await seedQuiz();
    const { body } = await start(quiz._id);
    await expire(body.attempt.id);
    await finalizeExpiredAttempts();

    for (const q of questions) {
      const res = await save(body.attempt.id, {
        answers: [{ questionId: q.id, selectedOption: questions.indexOf(q) }],
      });
      expect(res.status).toBe(409);
    }
    expect(await Attempt.findById(body.attempt.id).lean()).toMatchObject({
      status: 'finalized',
      score: 0,
      answers: [],
    });
  });

  it('TC-ATT-11 ignores any time or deadline sent by the client', async () => {
    const { quiz, questions } = await seedQuiz();
    const { body } = await start(quiz._id);
    await expire(body.attempt.id);

    const res = await save(body.attempt.id, {
      answers: [{ questionId: questions[0].id, selectedOption: 0 }],
      now: new Date(0).toISOString(),
      deadlineAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    });

    expect(res.status).toBe(409);
    expect(await Attempt.findById(body.attempt.id).lean()).toMatchObject({ score: 0 });
  });

  it('TC-ATT-11 returns the server time so the countdown does not depend on the browser clock', async () => {
    const { quiz } = await seedQuiz();
    const res = await start(quiz._id);

    expect(Math.abs(new Date(res.body.serverTime).getTime() - Date.now())).toBeLessThan(5000);
  });

  it('TC-ATT-12 accepts a save 1 s before the deadline and rejects one 1 s after', async () => {
    const { quiz, questions } = await seedQuiz(60);
    const startedAt = new Date('2026-10-28T10:00:00Z');
    const { attempt } = await startOrResumeAttempt(student, quiz.id, startedAt);
    const deadline = new Date(attempt.deadlineAt).getTime();
    const answer = (n) => [{ questionId: questions[n].id, selectedOption: n }];

    const before = await saveAnswers(student, attempt.id, answer(0), new Date(deadline - 1000));
    expect(before.answers).toHaveLength(1);

    await expect(
      saveAnswers(student, attempt.id, answer(1), new Date(deadline + 1000))
    ).rejects.toMatchObject({ status: 409 });
    expect(await Attempt.findById(attempt.id).lean()).toMatchObject({
      status: 'finalized',
      score: 1,
      submittedAt: new Date(deadline),
    });
  });

  it('finalizes expired attempts in the periodic sweep and leaves active ones alone', async () => {
    const { quiz } = await seedQuiz();
    const other = await seedQuiz();
    const expired = await startOrResumeAttempt(student, quiz.id, new Date(Date.now() - 700 * 1000));
    const active = await startOrResumeAttempt(student, other.quiz.id);

    expect(await finalizeExpiredAttempts()).toBe(1);
    expect((await Attempt.findById(expired.attempt.id)).status).toBe('finalized');
    expect((await Attempt.findById(active.attempt.id)).status).toBe('in_progress');
  });

  it('NFR-002 finalizing the same attempt concurrently stores one result', async () => {
    const { quiz, questions } = await seedQuiz();
    const { attempt } = await startOrResumeAttempt(student, quiz.id);
    await saveAnswers(student, attempt.id, [{ questionId: questions[0].id, selectedOption: 0 }]);
    const doc = await Attempt.findById(attempt.id);

    const results = await Promise.all([finalizeAttempt(doc), finalizeAttempt(doc)]);

    expect(results.map((r) => r.score)).toEqual([1, 1]);
    expect(String(results[0].submittedAt)).toBe(String(results[1].submittedAt));
  });

  it('scores an answer saved just before submission instead of an older copy', async () => {
    const { quiz, questions } = await seedQuiz();
    const { attempt } = await startOrResumeAttempt(student, quiz.id);
    const stale = await Attempt.findById(attempt.id);
    await saveAnswers(student, attempt.id, [{ questionId: questions[1].id, selectedOption: 1 }]);

    expect((await finalizeAttempt(stale)).score).toBe(1);
  });
});
