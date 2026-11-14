import mongoose from 'mongoose';
import Attempt from '../models/Attempt.js';
import Question from '../models/Question.js';
import Quiz from '../models/Quiz.js';

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

const STAFF_ROLES = new Set(['faculty', 'administrator']);

/**
 * FR-022 / FR-023: the leaderboard of one quiz.
 * Only finalized attempts of that quiz are ranked: highest score first, earlier submission first on
 * equal scores, and the attempt id as a last resort so the order is identical on every load (TC-LB-03).
 * Students only see leaderboards of published quizzes; staff can also see drafts.
 * Only the student's name is shown (SAD 7 open issue "leaderboard privacy": names, no email addresses).
 */
export async function getQuizLeaderboard(quizId, viewer) {
  if (!mongoose.isValidObjectId(quizId)) throw httpError(400, 'Invalid quiz id');

  const quiz = await Quiz.findById(quizId).select('title topic status').lean();
  const canSeeDrafts = STAFF_ROLES.has(viewer?.role);
  if (!quiz || (quiz.status !== 'published' && !canSeeDrafts)) {
    throw httpError(404, 'Quiz not found');
  }

  const [attempts, questionCount] = await Promise.all([
    Attempt.find({ quizId, status: 'finalized' })
      .select('userId score submittedAt')
      .sort({ score: -1, submittedAt: 1, _id: 1 })
      .populate('userId', 'name')
      .lean(),
    Question.countDocuments({ quizId }),
  ]);

  return {
    quiz: { id: String(quiz._id), title: quiz.title, topic: quiz.topic, questionCount },
    entries: attempts.map((a, index) => ({
      rank: index + 1,
      name: a.userId?.name ?? 'Former student',
      score: a.score,
      submittedAt: a.submittedAt,
      isMe: String(a.userId?._id ?? a.userId) === String(viewer?.id),
    })),
  };
}
