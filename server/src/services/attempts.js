import mongoose from 'mongoose';
import Attempt from '../models/Attempt.js';
import Question from '../models/Question.js';
import Quiz from '../models/Quiz.js';

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function requireObjectId(value, label) {
  if (!mongoose.isValidObjectId(value)) throw httpError(400, `Invalid ${label} id`);
}

// What the student sees of an attempt: no score or answer key here (SEC-003).
function toAttemptView(attempt) {
  return {
    id: String(attempt._id),
    quizId: String(attempt.quizId),
    status: attempt.status,
    startedAt: attempt.startedAt,
    deadlineAt: attempt.deadlineAt,
    answers: attempt.answers.map((a) => ({
      questionId: String(a.questionId),
      selectedOption: a.selectedOption,
    })),
  };
}

// Questions without the correct option (Question.correctOption is never selected here).
async function studentQuestions(quizId) {
  const questions = await Question.find({ quizId })
    .select('prompt options')
    .sort({ _id: 1 })
    .lean();
  return questions.map((q) => ({ id: String(q._id), prompt: q.prompt, options: q.options }));
}

/**
 * FR-013: one attempt record per student per quiz.
 * Creates the attempt with a server-side deadline, or resumes the student's active attempt.
 * A finalized attempt cannot be restarted (409). Safe against concurrent start requests (TC-ATT-13).
 */
export async function startOrResumeAttempt(userId, quizId, now = new Date()) {
  requireObjectId(quizId, 'quiz');
  const quiz = await Quiz.findOne({ _id: quizId, status: 'published' })
    .select('durationSeconds')
    .lean();
  if (!quiz) throw httpError(404, 'Quiz not found');

  let attempt;
  let created = false;
  try {
    const result = await Attempt.findOneAndUpdate(
      { userId, quizId },
      {
        $setOnInsert: {
          userId,
          quizId,
          status: 'in_progress',
          answers: [],
          startedAt: now,
          deadlineAt: new Date(now.getTime() + quiz.durationSeconds * 1000),
        },
      },
      { upsert: true, new: true, includeResultMetadata: true }
    );
    attempt = result.value;
    created = !result.lastErrorObject?.updatedExisting;
  } catch (err) {
    // Two simultaneous first starts: the unique (userId, quizId) index lets only one insert win.
    if (err.code !== 11000) throw err;
    attempt = await Attempt.findOne({ userId, quizId });
  }

  if (attempt.status === 'finalized') {
    throw httpError(409, 'You have already completed this quiz');
  }
  return { created, attempt: toAttemptView(attempt), questions: await studentQuestions(quizId) };
}

/**
 * FR-015: save the student's selected answers during an active attempt.
 * Only the owner may save, only while the attempt is in progress and before the server deadline (NFR-003).
 * Body: answers = [{ questionId, selectedOption }]; each entry replaces the previous answer for that question.
 */
export async function saveAnswers(userId, attemptId, answers, now = new Date()) {
  requireObjectId(attemptId, 'attempt');
  const attempt = await Attempt.findById(attemptId);
  if (!attempt) throw httpError(404, 'Attempt not found');
  if (String(attempt.userId) !== String(userId)) throw httpError(403, 'Not your attempt');
  if (attempt.status !== 'in_progress')
    throw httpError(409, 'This attempt has already been submitted');
  if (now >= attempt.deadlineAt) throw httpError(409, 'Time is up for this attempt');

  if (!Array.isArray(answers) || answers.length === 0) {
    throw httpError(422, 'answers must be a non-empty list');
  }
  const questions = await Question.find({ quizId: attempt.quizId }).select('options').lean();
  const optionCounts = new Map(questions.map((q) => [String(q._id), q.options.length]));
  for (const a of answers) {
    const count = optionCounts.get(String(a?.questionId));
    if (count === undefined) throw httpError(422, 'Answer refers to a question outside this quiz');
    if (!Number.isInteger(a.selectedOption) || a.selectedOption < 0 || a.selectedOption >= count) {
      throw httpError(422, 'selectedOption is out of range');
    }
  }

  const merged = new Map(attempt.answers.map((a) => [String(a.questionId), a.selectedOption]));
  for (const a of answers) merged.set(String(a.questionId), a.selectedOption);

  // Conditional update: rejects the save if the attempt was finalized or expired in the meantime.
  const updated = await Attempt.findOneAndUpdate(
    { _id: attempt._id, status: 'in_progress', deadlineAt: { $gt: now } },
    {
      $set: {
        answers: [...merged].map(([questionId, selectedOption]) => ({
          questionId,
          selectedOption,
        })),
      },
    },
    { new: true }
  );
  if (!updated) throw httpError(409, 'This attempt can no longer be changed');
  return toAttemptView(updated);
}
