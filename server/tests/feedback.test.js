import bcrypt from 'bcryptjs';
import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import Feedback from '../src/models/Feedback.js';
import User from '../src/models/User.js';
import { createFeedbackRouter } from '../src/routes/feedback.js';
import { clearTestDB, closeTestDB, connectTestDB } from './helpers/db.js';

// Stand-in for authenticate middleware to allow header-based user/role simulation
function fakeAuth(req, _res, next) {
  if (req.get('x-test-user')) {
    req.user = {
      id: req.get('x-test-user'),
      name: req.get('x-test-name') || 'Test User',
      email: req.get('x-test-email') || 'test@example.com',
      role: req.get('x-test-role') || 'student',
    };
  }
  next();
}

function fakeAdminAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (req.user.role !== 'administrator') {
    return res.status(403).json({ error: 'You do not have permission to access this resource' });
  }
  return next();
}

const customApp = express();
customApp.use(express.json());
customApp.use('/api', createFeedbackRouter(fakeAuth, fakeAdminAuth));
customApp.use(errorHandler);

const fullApp = createApp();

const studentId = new mongoose.Types.ObjectId().toString();
const facultyId = new mongoose.Types.ObjectId().toString();
const adminId = new mongoose.Types.ObjectId().toString();

const asStudent = {
  'x-test-user': studentId,
  'x-test-role': 'student',
  'x-test-name': 'Student One',
  'x-test-email': 'student01@example.com',
};

const asFaculty = {
  'x-test-user': facultyId,
  'x-test-role': 'faculty',
  'x-test-name': 'Faculty One',
  'x-test-email': 'faculty01@example.com',
};

const asAdmin = {
  'x-test-user': adminId,
  'x-test-role': 'administrator',
  'x-test-name': 'Admin One',
  'x-test-email': 'admin01@example.com',
};

describe('OQS-18: Feedback submission and administrator feedback review', () => {
  beforeAll(async () => {
    await connectTestDB();
    await User.init();
    await Feedback.init();
  });

  afterEach(clearTestDB);
  afterAll(closeTestDB);

  it('TC-FB-01 stores feedback with valid rating and message and returns acknowledgment', async () => {
    const res = await request(customApp)
      .post('/api/feedback')
      .set(asStudent)
      .send({ rating: 5, message: 'Excellent quiz platform!' });

    expect(res.status).toBe(201);
    expect(res.body.feedback).toBeDefined();
    expect(res.body.feedback.rating).toBe(5);
    expect(res.body.feedback.message).toBe('Excellent quiz platform!');
    expect(res.body.feedback.userId).toBe(studentId);

    const stored = await Feedback.findById(res.body.feedback.id);
    expect(stored).not.toBeNull();
    expect(stored.rating).toBe(5);
    expect(stored.message).toBe('Excellent quiz platform!');
    expect(String(stored.userId)).toBe(studentId);
  });

  it('allows submitting feedback with rating only or message only', async () => {
    const resRatingOnly = await request(customApp)
      .post('/api/feedback')
      .set(asStudent)
      .send({ rating: 4 });

    expect(resRatingOnly.status).toBe(201);
    expect(resRatingOnly.body.feedback.rating).toBe(4);
    expect(resRatingOnly.body.feedback.message).toBe('');

    const resMessageOnly = await request(customApp)
      .post('/api/feedback')
      .set(asStudent)
      .send({ message: 'Good effort, needs more physics quizzes.' });

    expect(resMessageOnly.status).toBe(201);
    expect(resMessageOnly.body.feedback.rating).toBeNull();
    expect(resMessageOnly.body.feedback.message).toBe('Good effort, needs more physics quizzes.');
  });

  it('TC-FB-02 rejects feedback with neither rating nor message (422)', async () => {
    const resEmpty = await request(customApp).post('/api/feedback').set(asStudent).send({});

    expect(resEmpty.status).toBe(422);
    expect(resEmpty.body.error).toMatch(/at least a rating or message/i);

    const resWhitespace = await request(customApp)
      .post('/api/feedback')
      .set(asStudent)
      .send({ message: '   ' });

    expect(resWhitespace.status).toBe(422);
    expect(await Feedback.countDocuments()).toBe(0);
  });

  it('TC-FB-03 rejects feedback submission without authentication (401)', async () => {
    const res = await request(customApp)
      .post('/api/feedback')
      .send({ rating: 5, message: 'Trying without auth' });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/authentication required/i);
    expect(await Feedback.countDocuments()).toBe(0);
  });

  it('TC-ADM-01 allows administrator to list all submitted feedback, sorted newest first', async () => {
    // Seed real users so populate works
    const studentUser = await User.create({
      name: 'Student One',
      email: 'student01@example.com',
      passwordHash: 'dummy',
      role: 'student',
    });

    const facultyUser = await User.create({
      name: 'Faculty One',
      email: 'faculty01@example.com',
      passwordHash: 'dummy',
      role: 'faculty',
    });

    const older = await Feedback.create({
      userId: studentUser._id,
      rating: 3,
      message: 'Older feedback',
      createdAt: new Date(Date.now() - 10000),
    });

    const newer = await Feedback.create({
      userId: facultyUser._id,
      rating: 5,
      message: 'Newer feedback',
      createdAt: new Date(),
    });

    const res = await request(customApp).get('/api/admin/feedback').set(asAdmin);

    expect(res.status).toBe(200);
    expect(res.body.feedback).toHaveLength(2);
    expect(res.body.feedback[0].id).toBe(String(newer._id));
    expect(res.body.feedback[0].userName).toBe('Faculty One');
    expect(res.body.feedback[0].userEmail).toBe('faculty01@example.com');
    expect(res.body.feedback[0].userRole).toBe('faculty');
    expect(res.body.feedback[0].rating).toBe(5);

    expect(res.body.feedback[1].id).toBe(String(older._id));
    expect(res.body.feedback[1].userName).toBe('Student One');
    expect(res.body.feedback[1].rating).toBe(3);
  });

  it('TC-ADM-02 denies students and faculty access to GET /api/admin/feedback (403)', async () => {
    const resStudent = await request(customApp).get('/api/admin/feedback').set(asStudent);

    expect(resStudent.status).toBe(403);
    expect(resStudent.body.error).toMatch(/permission/i);

    const resFaculty = await request(customApp).get('/api/admin/feedback').set(asFaculty);

    expect(resFaculty.status).toBe(403);
    expect(resFaculty.body.error).toMatch(/permission/i);
  });

  it('TC-ADM-02 rejects unauthenticated access to GET /api/admin/feedback (401)', async () => {
    const res = await request(customApp).get('/api/admin/feedback');
    expect(res.status).toBe(401);
  });

  it('TC-SEC-04 validates rating range, types and message length limits', async () => {
    // Rating out of bounds (< 1)
    const resLow = await request(customApp)
      .post('/api/feedback')
      .set(asStudent)
      .send({ rating: 0, message: 'Too low' });
    expect(resLow.status).toBe(422);

    // Rating out of bounds (> 5)
    const resHigh = await request(customApp)
      .post('/api/feedback')
      .set(asStudent)
      .send({ rating: 6, message: 'Too high' });
    expect(resHigh.status).toBe(422);

    // Rating not an integer
    const resFloat = await request(customApp)
      .post('/api/feedback')
      .set(asStudent)
      .send({ rating: 4.5, message: 'Fractional' });
    expect(resFloat.status).toBe(422);

    // Non-string message
    const resNonString = await request(customApp)
      .post('/api/feedback')
      .set(asStudent)
      .send({ rating: 3, message: { text: 'bad' } });
    expect(resNonString.status).toBe(422);

    // Message exceeding 1000 characters
    const longMessage = 'a'.repeat(1001);
    const resLong = await request(customApp)
      .post('/api/feedback')
      .set(asStudent)
      .send({ rating: 5, message: longMessage });
    expect(resLong.status).toBe(422);
    expect(resLong.body.error).toMatch(/1000 characters/i);
  });

  it('TC-SEC-06 safely stores script tags in feedback message as literal text', async () => {
    const scriptMessage = '<script>alert(1)</script>';
    const res = await request(customApp)
      .post('/api/feedback')
      .set(asStudent)
      .send({ rating: 2, message: scriptMessage });

    expect(res.status).toBe(201);
    expect(res.body.feedback.message).toBe(scriptMessage);

    const stored = await Feedback.findById(res.body.feedback.id);
    expect(stored.message).toBe(scriptMessage);
  });

  it('never trusts a user ID passed in the request body (binds only to auth)', async () => {
    const spoofedId = new mongoose.Types.ObjectId().toString();
    const res = await request(customApp)
      .post('/api/feedback')
      .set(asStudent)
      .send({ userId: spoofedId, rating: 5, message: 'Spoof attempt' });

    expect(res.status).toBe(201);
    expect(res.body.feedback.userId).toBe(studentId);
    expect(res.body.feedback.userId).not.toBe(spoofedId);
  });

  it('works end-to-end via createApp with real login tokens', async () => {
    // 1. Register and log in student
    await request(fullApp).post('/api/auth/register').send({
      name: 'E2E Student',
      email: 'e2e-student@example.com',
      password: 'SecurePass123',
    });
    const studentLogin = await request(fullApp).post('/api/auth/login').send({
      email: 'e2e-student@example.com',
      password: 'SecurePass123',
    });
    const studentToken = studentLogin.body.token;

    // 2. Create admin in DB and log in
    const adminPasswordHash = await bcrypt.hash('SecurePass123', 10);
    await User.create({
      name: 'E2E Admin',
      email: 'e2e-admin@example.com',
      passwordHash: adminPasswordHash,
      role: 'administrator',
    });

    const adminLogin = await request(fullApp).post('/api/auth/login').send({
      email: 'e2e-admin@example.com',
      password: 'SecurePass123',
    });
    const adminToken = adminLogin.body.token;

    // 3. Student submits feedback
    const submitRes = await request(fullApp)
      .post('/api/feedback')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ rating: 5, message: 'Loved the quiz!' });
    expect(submitRes.status).toBe(201);

    // 4. Student tries to view admin feedback -> 403
    const studentReviewRes = await request(fullApp)
      .get('/api/admin/feedback')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(studentReviewRes.status).toBe(403);

    // 5. Admin views feedback -> 200
    const adminReviewRes = await request(fullApp)
      .get('/api/admin/feedback')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminReviewRes.status).toBe(200);
    expect(adminReviewRes.body.feedback.length).toBeGreaterThanOrEqual(1);
    expect(adminReviewRes.body.feedback[0].userName).toBe('E2E Student');
  });
});
