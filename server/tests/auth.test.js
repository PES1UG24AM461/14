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

describe('OQS-04: Student registration', () => {
  it('STP-OQS04-01: registers a student successfully', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: 'Test Student',
      email: 'student@example.com',
      password: 'SecurePass123',
    });

    expect(response.status).toBe(201);
    expect(response.body.user.name).toBe('Test Student');
    expect(response.body.user.email).toBe('student@example.com');
    expect(response.body.user.role).toBe('student');
    expect(response.body.user.passwordHash).toBeUndefined();

    const savedUser = await User.findOne({
      email: 'student@example.com',
    }).select('+passwordHash');

    expect(savedUser).not.toBeNull();
    expect(savedUser.passwordHash).not.toBe('SecurePass123');
    expect(savedUser.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  it('STP-OQS04-02: rejects a duplicate email address', async () => {
    const details = {
      name: 'Test Student',
      email: 'student@example.com',
      password: 'SecurePass123',
    };

    const first = await request(app).post('/api/auth/register').send(details);
    const second = await request(app)
      .post('/api/auth/register')
      .send({
        ...details,
        email: 'STUDENT@example.com',
      });

    expect(first.status).toBe(201);
    expect(second.status).toBe(409);
  });

  it('STP-OQS04-03: rejects invalid registration input', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: 'A',
      email: 'not-an-email',
      password: 'short',
    });

    expect(response.status).toBe(400);
  });

  it('STP-OQS04-04: does not allow public registration with an elevated role', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: 'Test Student',
      email: 'student@example.com',
      password: 'SecurePass123',
      role: 'administrator',
    });

    expect(response.status).toBe(201);
    expect(response.body.user.role).toBe('student');

    const savedUser = await User.findOne({
      email: 'student@example.com',
    });

    expect(savedUser.role).toBe('student');
  });
});
