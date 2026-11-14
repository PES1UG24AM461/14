import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { validateObjectIdParam } from '../../src/middleware/validateObjectIdParam.js';

describe('validateObjectIdParam middleware', () => {
  const app = express();
  app.get('/test/:id', validateObjectIdParam('id'), (_req, res) => {
    res.status(200).json({ ok: true });
  });

  it('passes for a valid ObjectId', async () => {
    const validId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(`/test/${validId}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('rejects an invalid ObjectId', async () => {
    const res = await request(app).get('/test/invalid-id');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid id id' });
  });
});
