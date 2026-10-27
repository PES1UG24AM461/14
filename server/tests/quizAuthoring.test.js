import bcrypt from 'bcryptjs';
import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import Question from '../src/models/Question.js';
import Quiz from '../src/models/Quiz.js';
import User from '../src/models/User.js';
import { createQuizAuthoringRouter } from '../src/routes/quizAuthoring.js';
import { clearTestDB, closeTestDB, connectTestDB } from './helpers/db.js';

// Stand-in for the authenticate middleware so tests can choose the user and role with headers.
function fakeAuth(req, _res, next) {
  if (req.get('x-test-user'))
    req.user = { id: req.get('x-test-user'), role: req.get('x-test-role') };
  next();
}

const app = express();
app.use(express.json());
app.use('/api', createQuizAuthoringRouter(fakeAuth));
app.use(errorHandler);

const facultyA = new mongoose.Types.ObjectId().toString();
const facultyB = new mongoose.Types.ObjectId().toString();
const admin = new mongoose.Types.ObjectId().toString();
const student = new mongoose.Types.ObjectId().toString();
const as = (id, role) => ({ 'x-test-user': id, 'x-test-role': role });
const asFacultyA = as(facultyA, 'faculty');

const validQuiz = () => ({
  title: 'JavaScript Basics',
  topic: 'Programming',
  durationSeconds: 600,
  questions: [
    { prompt: 'What is 2 + 2?', options: ['3', '4', '5', '6'], correctOption: 1 },
    { prompt: 'Which is a keyword?', options: ['let', 'foo'], correctOption: 0 },
  ],
});

const create = (body = validQuiz(), headers = asFacultyA) =>
  request(app).post('/api/quizzes').set(headers).send(body);

describe('OQS-07: quiz authoring API', () => {
  beforeAll(connectTestDB);
  afterEach(clearTestDB);
  afterAll(closeTestDB);

  it('TC-QM-01 creates a quiz as a draft (not visible to students until published)', async () => {
    const res = await create();

    expect(res.status).toBe(201);
    expect(res.body.quiz).toMatchObject({
      title: 'JavaScript Basics',
      status: 'draft',
      createdBy: facultyA,
    });
    expect(res.body.quiz.questions).toHaveLength(2);
    expect((await Quiz.findById(res.body.quiz.id)).status).toBe('draft');
  });

  it('TC-QM-02 rejects a missing title and a duration that is not positive (422)', async () => {
    const noTitle = await create({ ...validQuiz(), title: '' });
    const badDuration = await create({ ...validQuiz(), durationSeconds: 0 });

    expect(noTitle.status).toBe(422);
    expect(noTitle.body.error).toMatch(/Title is required/);
    expect(badDuration.status).toBe(422);
    expect(await Quiz.countDocuments()).toBe(0);
  });

  it('TC-QM-03 stores multiple-choice questions with their correct option', async () => {
    const res = await create();
    const stored = await Question.find({ quizId: res.body.quiz.id })
      .select('+correctOption')
      .sort({ _id: 1 });

    expect(stored.map((q) => q.correctOption)).toEqual([1, 0]);
    expect(stored[0].options).toEqual(['3', '4', '5', '6']);
  });

  it('TC-QM-04 rejects a question with only one option (422) and saves nothing', async () => {
    const body = validQuiz();
    body.questions[1].options = ['only one'];
    body.questions[1].correctOption = 0;
    const res = await create(body);

    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/Question 2: .*at least two options/);
    expect(await Quiz.countDocuments()).toBe(0);
    expect(await Question.countDocuments()).toBe(0);
  });

  it('TC-QM-05 rejects a question without a valid correct option (422)', async () => {
    const missing = validQuiz();
    delete missing.questions[0].correctOption;
    const outOfRange = validQuiz();
    outOfRange.questions[0].correctOption = 7;

    expect((await create(missing)).status).toBe(422);
    expect((await create(outOfRange)).status).toBe(422);
  });

  it('TC-QM-06 lets the owner edit a draft and delete a draft with its questions', async () => {
    const first = (await create()).body.quiz;
    const second = (await create({ ...validQuiz(), title: 'To delete' })).body.quiz;

    const edited = await request(app)
      .patch(`/api/quizzes/${first.id}`)
      .set(asFacultyA)
      .send({
        title: 'JavaScript Basics 2',
        questions: [{ prompt: 'New?', options: ['y', 'n'], correctOption: 0 }],
      });
    expect(edited.status).toBe(200);
    expect(edited.body.quiz.title).toBe('JavaScript Basics 2');
    expect(edited.body.quiz.questions).toHaveLength(1);

    const deleted = await request(app).delete(`/api/quizzes/${second.id}`).set(asFacultyA);
    expect(deleted.status).toBe(204);
    expect(await Quiz.findById(second.id)).toBeNull();
    expect(await Question.countDocuments({ quizId: second.id })).toBe(0);
  });

  it("TC-QM-07 stops a faculty member editing or deleting another faculty member's quiz (403)", async () => {
    const quiz = (await create()).body.quiz;
    const other = as(facultyB, 'faculty');

    expect(
      (await request(app).patch(`/api/quizzes/${quiz.id}`).set(other).send({ title: 'Mine' }))
        .status
    ).toBe(403);
    expect((await request(app).delete(`/api/quizzes/${quiz.id}`).set(other)).status).toBe(403);
    expect((await Quiz.findById(quiz.id)).title).toBe('JavaScript Basics');
  });

  it("TC-QM-08 lets an administrator edit a faculty member's draft", async () => {
    const quiz = (await create()).body.quiz;
    const res = await request(app)
      .patch(`/api/quizzes/${quiz.id}`)
      .set(as(admin, 'administrator'))
      .send({ topic: 'Web Development' });

    expect(res.status).toBe(200);
    expect(res.body.quiz.topic).toBe('Web Development');
  });

  it('TC-AUTH-08 stops students creating, editing or deleting quizzes (403)', async () => {
    const quiz = (await create()).body.quiz;
    const asStudent = as(student, 'student');

    expect((await create(validQuiz(), asStudent)).status).toBe(403);
    expect(
      (await request(app).patch(`/api/quizzes/${quiz.id}`).set(asStudent).send({ title: 'x' }))
        .status
    ).toBe(403);
    expect((await request(app).delete(`/api/quizzes/${quiz.id}`).set(asStudent)).status).toBe(403);
    expect((await request(app).get('/api/manage/quizzes').set(asStudent)).status).toBe(403);
  });

  it('lists only the quizzes a faculty member owns; administrators see all', async () => {
    await create();
    await create({ ...validQuiz(), title: 'B quiz' }, as(facultyB, 'faculty'));

    const mine = await request(app).get('/api/manage/quizzes').set(asFacultyA);
    const all = await request(app).get('/api/manage/quizzes').set(as(admin, 'administrator'));

    expect(mine.body.quizzes.map((q) => q.title)).toEqual(['JavaScript Basics']);
    expect(mine.body.quizzes[0]).toMatchObject({ status: 'draft', questionCount: 2 });
    expect(all.body.quizzes).toHaveLength(2);
  });

  it('returns the full quiz with correct options to its owner for editing', async () => {
    const quiz = (await create()).body.quiz;
    const res = await request(app).get(`/api/manage/quizzes/${quiz.id}`).set(asFacultyA);

    expect(res.status).toBe(200);
    expect(res.body.quiz.questions.map((q) => q.correctOption)).toEqual([1, 0]);
  });

  it('does not allow editing or deleting a published quiz (409)', async () => {
    const quiz = (await create()).body.quiz;
    await Quiz.updateOne({ _id: quiz.id }, { status: 'published' });

    expect(
      (await request(app).patch(`/api/quizzes/${quiz.id}`).set(asFacultyA).send({ title: 'x' }))
        .status
    ).toBe(409);
    expect((await request(app).delete(`/api/quizzes/${quiz.id}`).set(asFacultyA)).status).toBe(409);
  });

  it('TC-SEC-04 rejects invalid ids and unknown quizzes', async () => {
    expect(
      (await request(app).patch('/api/quizzes/not-an-id').set(asFacultyA).send({})).status
    ).toBe(400);
    const missing = new mongoose.Types.ObjectId().toString();
    expect((await request(app).delete(`/api/quizzes/${missing}`).set(asFacultyA)).status).toBe(404);
  });

  it('works end to end with a real faculty login and rejects requests without a token', async () => {
    const realApp = createApp();
    await User.create({
      name: 'Dr Faculty',
      email: 'faculty@example.com',
      passwordHash: await bcrypt.hash('FacultyPass123', 10),
      role: 'faculty',
    });
    const login = await request(realApp)
      .post('/api/auth/login')
      .send({ email: 'faculty@example.com', password: 'FacultyPass123' });
    const res = await request(realApp)
      .post('/api/quizzes')
      .set('Authorization', `Bearer ${login.body.token}`)
      .send(validQuiz());

    expect(res.status).toBe(201);
    expect((await request(realApp).post('/api/quizzes').send(validQuiz())).status).toBe(401);
  });
});
