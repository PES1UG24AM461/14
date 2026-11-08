import { describe, it, expect } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import createApp from '../../src/app.js';

const app = createApp();

describe('Quizzes route validation', () => {
  it('returns 400 for malformed quizId', async () => {
    const res = await request(app).get('/api/quizzes/invalid-id');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid quizId id' });
  });

  it('returns 200 for a valid quizId (existing or not) – service will handle not‑found', async () => {
    const validId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(`/api/quizzes/${validId}`);
    // The service may return 404 for unknown id, but the validation layer must not reject it.
    expect([200, 404]).toContain(res.status);
  });
});
