import { describe, it, expect } from 'vitest';
import request from 'supertest';
import createApp from '../../src/app.js';

const app = createApp();

describe('Attempts route validation', () => {
  const endpoints = [
    { method: 'post', url: (id) => `/api/quizzes/${id}/attempts` },
    { method: 'patch', url: (id) => `/api/attempts/${id}/answers` },
    { method: 'post', url: (id) => `/api/attempts/${id}/submit` },
    { method: 'get', url: (id) => `/api/attempts/${id}/result` },
  ];

  for (const ep of endpoints) {
    it(`returns 400 for malformed id on ${ep.method.toUpperCase()} ${ep.url('invalid-id')}`, async () => {
      const res = await request(app)[ep.method](ep.url('invalid-id')).send({ answers: [] });
      expect(res.status).toBe(400);
      // Message format: "Invalid <paramName> id"
      const paramName = ep.url('invalid-id').includes('/quizzes/') ? 'quizId' : 'attemptId';
      expect(res.body).toEqual({ error: `Invalid ${paramName} id` });
    });
  }
});
