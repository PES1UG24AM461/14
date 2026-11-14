import request from 'supertest';
import { describe, expect, it } from 'vitest';
import createApp from '../../src/app.js';
const app = createApp();

describe('Quizzes route validation', () => {
  it('returns 400 for malformed quizId', async () => {
    const res = await request(app).get('/api/quizzes/invalid-id');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid quiz id' });
  });
});
