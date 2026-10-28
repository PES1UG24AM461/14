import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import User from '../src/models/User.js';
import { connectTestDB, clearTestDB, closeTestDB } from './helpers/db.js';

const app = createApp();

beforeAll(async () => {
  await connectTestDB();
  await User.init();
});

afterEach(async () => {
  await clearTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

async function registerAndLogin(email = 'student@example.com') {
  await request(app).post('/api/auth/register').send({
    name: 'Test User',
    email,
    password: 'SecurePass123',
  });

  const response = await request(app).post('/api/auth/login').send({
    email,
    password: 'SecurePass123',
  });

  return response.body.token;
}

describe('OQS-06: Role-based access control', () => {
  it('allows an authenticated student to access their own role', async () => {
    const token = await registerAndLogin();

    const response = await request(app)
      .get('/api/roles/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.user.role).toBe('student');
  });

  it('rejects access to role information without authentication', async () => {
    const response = await request(app).get('/api/roles/me');

    expect(response.status).toBe(401);
  });

  it('denies students access to quiz management', async () => {
    const token = await registerAndLogin();

    const response = await request(app)
      .get('/api/roles/quiz-management')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
  });

  it('denies students access to administration', async () => {
    const token = await registerAndLogin();

    const response = await request(app)
      .get('/api/roles/administration')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
  });
});
