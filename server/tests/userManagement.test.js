import bcrypt from 'bcryptjs';
import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import User from '../src/models/User.js';
import { createUserManagementRouter } from '../src/routes/userManagement.js';
import { clearTestDB, closeTestDB, connectTestDB } from './helpers/db.js';

function fakeAuth(req, _res, next) {
  if (req.get('x-test-user')) {
    req.user = {
      id: req.get('x-test-user'),
      role: req.get('x-test-role') || 'student',
      name: req.get('x-test-name') || 'Test User',
      email: req.get('x-test-email') || 'test@example.com',
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
customApp.use('/api', createUserManagementRouter(fakeAuth, fakeAdminAuth));
customApp.use(errorHandler);

const fullApp = createApp();

const adminId = new mongoose.Types.ObjectId().toString();
const facultyId = new mongoose.Types.ObjectId().toString();
const studentId = new mongoose.Types.ObjectId().toString();

const asAdmin = {
  'x-test-user': adminId,
  'x-test-role': 'administrator',
  'x-test-name': 'Admin User',
  'x-test-email': 'admin@example.com',
};

const asFaculty = {
  'x-test-user': facultyId,
  'x-test-role': 'faculty',
  'x-test-name': 'Faculty User',
  'x-test-email': 'faculty@example.com',
};

const asStudent = {
  'x-test-user': studentId,
  'x-test-role': 'student',
  'x-test-name': 'Student User',
  'x-test-email': 'student@example.com',
};

describe('OQS-19: Admin Role Management (FR-026)', () => {
  beforeAll(async () => {
    await connectTestDB();
    await User.init();
  });

  afterEach(clearTestDB);
  afterAll(closeTestDB);

  it('TC-ADM-03 administrator lists users and updates a user role from student to faculty', async () => {
    const passwordHash = await bcrypt.hash('SecurePass123', 10);
    const targetUser = await User.create({
      name: 'Asha Student',
      email: 'asha@example.com',
      passwordHash,
      role: 'student',
    });

    // 1. Admin lists all users
    const listRes = await request(customApp).get('/api/admin/users').set(asAdmin);

    expect(listRes.status).toBe(200);
    expect(listRes.body.users).toBeDefined();
    expect(listRes.body.users.length).toBeGreaterThanOrEqual(1);

    const listedUser = listRes.body.users.find((u) => u.id === String(targetUser._id));
    expect(listedUser).toBeDefined();
    expect(listedUser.name).toBe('Asha Student');
    expect(listedUser.email).toBe('asha@example.com');
    expect(listedUser.role).toBe('student');
    // Ensure sensitive fields are not exposed
    expect(listedUser.passwordHash).toBeUndefined();
    expect(listedUser.tokenVersion).toBeUndefined();

    // 2. Admin updates the user's role to faculty
    const updateRes = await request(customApp)
      .patch(`/api/admin/users/${targetUser._id}/role`)
      .set(asAdmin)
      .send({ role: 'faculty' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.user).toBeDefined();
    expect(updateRes.body.user.id).toBe(String(targetUser._id));
    expect(updateRes.body.user.role).toBe('faculty');
    expect(updateRes.body.user.passwordHash).toBeUndefined();

    // Verify in database
    const dbUser = await User.findById(targetUser._id);
    expect(dbUser.role).toBe('faculty');
  });

  it('TC-ADM-04 and TC-AUTH-09 deny faculty and students access to role management (403)', async () => {
    const targetId = new mongoose.Types.ObjectId().toString();

    // Student attempts GET /api/admin/users
    const getStudent = await request(customApp).get('/api/admin/users').set(asStudent);
    expect(getStudent.status).toBe(403);

    // Faculty attempts GET /api/admin/users
    const getFaculty = await request(customApp).get('/api/admin/users').set(asFaculty);
    expect(getFaculty.status).toBe(403);

    // Student attempts PATCH /api/admin/users/:userId/role
    const patchStudent = await request(customApp)
      .patch(`/api/admin/users/${targetId}/role`)
      .set(asStudent)
      .send({ role: 'faculty' });
    expect(patchStudent.status).toBe(403);

    // Faculty attempts PATCH /api/admin/users/:userId/role (TC-AUTH-09)
    const patchFaculty = await request(customApp)
      .patch(`/api/admin/users/${targetId}/role`)
      .set(asFaculty)
      .send({ role: 'administrator' });
    expect(patchFaculty.status).toBe(403);
  });

  it('rejects unauthenticated requests to role management endpoints (401)', async () => {
    const targetId = new mongoose.Types.ObjectId().toString();

    const getRes = await request(customApp).get('/api/admin/users');
    expect(getRes.status).toBe(401);

    const patchRes = await request(customApp)
      .patch(`/api/admin/users/${targetId}/role`)
      .send({ role: 'faculty' });
    expect(patchRes.status).toBe(401);
  });

  it('TC-SEC-04 validates user ID format and role choices', async () => {
    const passwordHash = await bcrypt.hash('SecurePass123', 10);
    const existing = await User.create({
      name: 'Test Target',
      email: 'target@example.com',
      passwordHash,
      role: 'student',
    });

    // Invalid ObjectId format -> 400
    const resInvalidId = await request(customApp)
      .patch('/api/admin/users/not-an-objectid/role')
      .set(asAdmin)
      .send({ role: 'faculty' });
    expect(resInvalidId.status).toBe(400);
    expect(resInvalidId.body.error).toMatch(/invalid user id/i);

    // Missing role -> 422
    const resMissingRole = await request(customApp)
      .patch(`/api/admin/users/${existing._id}/role`)
      .set(asAdmin)
      .send({});
    expect(resMissingRole.status).toBe(422);

    // Invalid role name -> 422
    const resInvalidRole = await request(customApp)
      .patch(`/api/admin/users/${existing._id}/role`)
      .set(asAdmin)
      .send({ role: 'superadmin' });
    expect(resInvalidRole.status).toBe(422);
    expect(resInvalidRole.body.error).toMatch(/one of: student, faculty, administrator/i);

    // Non-string role -> 422
    const resNonStringRole = await request(customApp)
      .patch(`/api/admin/users/${existing._id}/role`)
      .set(asAdmin)
      .send({ role: 123 });
    expect(resNonStringRole.status).toBe(422);

    // Non-existent user -> 404
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const resNotFound = await request(customApp)
      .patch(`/api/admin/users/${nonExistentId}/role`)
      .set(asAdmin)
      .send({ role: 'administrator' });
    expect(resNotFound.status).toBe(404);
    expect(resNotFound.body.error).toMatch(/user not found/i);
  });

  it('works end-to-end via createApp with real login tokens, and promoted user gains faculty permissions', async () => {
    // 1. Register a student user
    await request(fullApp).post('/api/auth/register').send({
      name: 'Promotable Student',
      email: 'promotable@example.com',
      password: 'SecurePass123',
    });

    const studentLogin = await request(fullApp).post('/api/auth/login').send({
      email: 'promotable@example.com',
      password: 'SecurePass123',
    });
    const studentToken = studentLogin.body.token;
    const studentUser = studentLogin.body.user;

    // 2. Student cannot access faculty quiz management endpoint (403)
    const beforePromotion = await request(fullApp)
      .get('/api/roles/quiz-management')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(beforePromotion.status).toBe(403);

    // 3. Create administrator in DB and log in
    const adminPasswordHash = await bcrypt.hash('SecurePass123', 10);
    await User.create({
      name: 'Real Admin',
      email: 'realadmin@example.com',
      passwordHash: adminPasswordHash,
      role: 'administrator',
    });

    const adminLogin = await request(fullApp).post('/api/auth/login').send({
      email: 'realadmin@example.com',
      password: 'SecurePass123',
    });
    const adminToken = adminLogin.body.token;

    // 4. Admin updates student role to faculty
    const updateRes = await request(fullApp)
      .patch(`/api/admin/users/${studentUser.id}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'faculty' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.user.role).toBe('faculty');

    // 5. The student token now immediately has faculty permissions without re-logging in!
    const afterPromotion = await request(fullApp)
      .get('/api/roles/quiz-management')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(afterPromotion.status).toBe(200);
    expect(afterPromotion.body.role).toBe('faculty');
  });
});
