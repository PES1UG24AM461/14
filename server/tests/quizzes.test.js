import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import Question from '../src/models/Question.js';
import Quiz from '../src/models/Quiz.js';
import mongoose from 'mongoose';
import { clearTestDB, closeTestDB, connectTestDB } from './helpers/db.js';

const app = createApp();
const owner = new mongoose.Types.ObjectId();

async function seed() {
  const js = await Quiz.create({
    title: 'JavaScript Basics',
    topic: 'Programming',
    durationSeconds: 600,
    status: 'published',
    createdBy: owner,
  });
  const ds = await Quiz.create({
    title: 'Data Structures',
    topic: 'CS Fundamentals',
    durationSeconds: 900,
    status: 'published',
    createdBy: owner,
  });
  const draft = await Quiz.create({
    title: 'Networks',
    topic: 'Programming',
    durationSeconds: 300,
    status: 'draft',
    createdBy: owner,
  });
  const questions = [1, 2, 3].map((n) => ({
    quizId: js._id,
    prompt: `JS question ${n}`,
    options: ['a', 'b', 'c', 'd'],
    correctOption: 1,
  }));
  questions.push({ quizId: ds._id, prompt: 'DS question', options: ['x', 'y'], correctOption: 0 });
  questions.push({
    quizId: draft._id,
    prompt: 'Draft question',
    options: ['p', 'q'],
    correctOption: 0,
  });
  await Question.insertMany(questions);
  return { js, ds, draft };
}

describe('OQS-10: quiz discovery', () => {
  beforeAll(connectTestDB);
  afterEach(clearTestDB);
  afterAll(closeTestDB);

  it('TC-NAV-01 lists only published quizzes, grouped by topic', async () => {
    await seed();
    const res = await request(app).get('/api/quizzes');

    expect(res.status).toBe(200);
    expect(res.body.topics.map((t) => t.topic)).toEqual(['CS Fundamentals', 'Programming']);
    const programming = res.body.topics.find((t) => t.topic === 'Programming');
    expect(programming.quizzes.map((q) => q.title)).toEqual(['JavaScript Basics']);
    expect(JSON.stringify(res.body)).not.toContain('Networks');
  });

  it('TC-NAV-02 does not return a draft quiz requested by id', async () => {
    const { draft } = await seed();
    const res = await request(app).get(`/api/quizzes/${draft._id}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Quiz not found');
  });

  it('TC-NAV-03 returns title, topic, duration and question count for a published quiz', async () => {
    const { js } = await seed();
    const res = await request(app).get(`/api/quizzes/${js._id}`);

    expect(res.status).toBe(200);
    expect(res.body.quiz).toEqual({
      id: String(js._id),
      title: 'JavaScript Basics',
      topic: 'Programming',
      durationSeconds: 600,
      questionCount: 3,
    });
  });

  it('TC-SCR-04 never exposes questions, answer keys or explanations in discovery responses', async () => {
    const { js } = await seed();
    const list = await request(app).get('/api/quizzes');
    const detail = await request(app).get(`/api/quizzes/${js._id}`);

    for (const body of [list.body, detail.body]) {
      const text = JSON.stringify(body);
      expect(text).not.toMatch(/correctOption|answer|explanation|prompt|options/i);
    }
  });

  it('TC-SEC-04 rejects an invalid quiz id with 400 instead of crashing', async () => {
    const res = await request(app).get('/api/quizzes/not-a-valid-id');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid quiz id');
  });

  it('returns an empty list when no quizzes are published', async () => {
    const res = await request(app).get('/api/quizzes');

    expect(res.status).toBe(200);
    expect(res.body.topics).toEqual([]);
  });
});
