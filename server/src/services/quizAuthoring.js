import mongoose from 'mongoose';
import Question from '../models/Question.js';
import Quiz from '../models/Quiz.js';

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

const isStaffAdmin = (user) => user.role === 'administrator';

// Faculty manage only the quizzes they created; administrators manage all (FR-010, SAD 3.9 ownership checks).
async function loadManageableQuiz(user, quizId) {
  if (!mongoose.isValidObjectId(quizId)) throw httpError(400, 'Invalid quiz id');
  const quiz = await Quiz.findById(quizId);
  if (!quiz) throw httpError(404, 'Quiz not found');
  if (!isStaffAdmin(user) && String(quiz.createdBy) !== String(user.id)) {
    throw httpError(403, 'You can only manage quizzes you created');
  }
  return quiz;
}

// Turns Mongoose validation errors into one readable 422 message (SAD 4.3.2).
function asValidationError(err) {
  if (err.name !== 'ValidationError') return err;
  const messages = Object.values(err.errors).map((e) => e.message);
  return httpError(422, messages.join('; '));
}

function pickQuizFields(body) {
  const fields = {};
  for (const key of ['title', 'topic', 'durationSeconds']) {
    if (body[key] !== undefined) fields[key] = body[key];
  }
  return fields;
}

// Validates every question before anything is written, so a bad question never leaves a half-saved quiz.
async function buildQuestions(quizId, questions) {
  if (!Array.isArray(questions)) throw httpError(422, 'questions must be a list');
  const docs = questions.map(
    (q) =>
      new Question({
        quizId,
        prompt: q?.prompt,
        options: q?.options,
        correctOption: q?.correctOption,
      })
  );
  for (const [index, doc] of docs.entries()) {
    try {
      await doc.validate();
    } catch (err) {
      const e = asValidationError(err);
      e.message = `Question ${index + 1}: ${e.message}`;
      throw e;
    }
  }
  return docs;
}

// Faculty view of a quiz, including the correct options (never used for student responses).
async function toManagedQuiz(quiz) {
  const questions = await Question.find({ quizId: quiz._id })
    .select('+correctOption')
    .sort({ _id: 1 })
    .lean();
  return {
    id: String(quiz._id),
    title: quiz.title,
    topic: quiz.topic,
    durationSeconds: quiz.durationSeconds,
    status: quiz.status,
    createdBy: String(quiz.createdBy),
    questions: questions.map((q) => ({
      id: String(q._id),
      prompt: q.prompt,
      options: q.options,
      correctOption: q.correctOption,
    })),
  };
}

// GET /api/manage/quizzes - quizzes the caller may manage, including drafts.
export async function listManageableQuizzes(user) {
  const filter = isStaffAdmin(user) ? {} : { createdBy: user.id };
  const quizzes = await Quiz.find(filter).sort({ updatedAt: -1 }).lean();
  const counts = await Question.aggregate([
    { $match: { quizId: { $in: quizzes.map((q) => q._id) } } },
    { $group: { _id: '$quizId', count: { $sum: 1 } } },
  ]);
  const countById = new Map(counts.map((c) => [String(c._id), c.count]));
  return quizzes.map((q) => ({
    id: String(q._id),
    title: q.title,
    topic: q.topic,
    durationSeconds: q.durationSeconds,
    status: q.status,
    questionCount: countById.get(String(q._id)) || 0,
  }));
}

export async function getManagedQuiz(user, quizId) {
  return toManagedQuiz(await loadManageableQuiz(user, quizId));
}

// FR-008, FR-009: create a quiz as a draft, optionally with its questions.
export async function createQuiz(user, body = {}) {
  const quiz = new Quiz({ ...pickQuizFields(body), status: 'draft', createdBy: user.id });
  try {
    await quiz.validate();
  } catch (err) {
    throw asValidationError(err);
  }
  const questions = await buildQuestions(quiz._id, body.questions ?? []);
  await quiz.save();
  if (questions.length) await Question.insertMany(questions);
  return toManagedQuiz(quiz);
}

// FR-010: edit a draft quiz. If `questions` is sent, it replaces the quiz's question list.
export async function updateQuiz(user, quizId, body = {}) {
  const quiz = await loadManageableQuiz(user, quizId);
  if (quiz.status !== 'draft') throw httpError(409, 'Unpublish the quiz before editing it');
  quiz.set(pickQuizFields(body));
  try {
    await quiz.validate();
  } catch (err) {
    throw asValidationError(err);
  }
  const questions =
    body.questions === undefined ? null : await buildQuestions(quiz._id, body.questions);
  await quiz.save();
  if (questions) {
    await Question.deleteMany({ quizId: quiz._id });
    if (questions.length) await Question.insertMany(questions);
  }
  return toManagedQuiz(quiz);
}

// FR-010: delete a draft quiz together with its questions.
export async function deleteQuiz(user, quizId) {
  const quiz = await loadManageableQuiz(user, quizId);
  if (quiz.status !== 'draft') throw httpError(409, 'Only draft quizzes can be deleted');
  await Question.deleteMany({ quizId: quiz._id });
  await quiz.deleteOne();
}
