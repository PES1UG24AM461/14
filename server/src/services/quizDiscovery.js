import mongoose from 'mongoose';
import Question from '../models/Question.js';
import Quiz from '../models/Quiz.js';

// Student-safe view of a quiz: metadata only, never questions, answer keys or explanations (FR-006, SEC-003).
function toQuizSummary(quiz, questionCount) {
  return {
    id: String(quiz._id),
    title: quiz.title,
    topic: quiz.topic,
    durationSeconds: quiz.durationSeconds,
    questionCount,
  };
}

async function countQuestions(quizIds) {
  const counts = await Question.aggregate([
    { $match: { quizId: { $in: quizIds } } },
    { $group: { _id: '$quizId', count: { $sum: 1 } } },
  ]);
  return new Map(counts.map((c) => [String(c._id), c.count]));
}

// FR-005: published quizzes only, grouped by topic (topics and titles in alphabetical order).
export async function listPublishedByTopic() {
  const quizzes = await Quiz.find({ status: 'published' })
    .select('title topic durationSeconds')
    .sort({ topic: 1, title: 1 })
    .lean();
  const counts = await countQuestions(quizzes.map((q) => q._id));

  const topics = new Map();
  for (const quiz of quizzes) {
    if (!topics.has(quiz.topic)) topics.set(quiz.topic, []);
    topics.get(quiz.topic).push(toQuizSummary(quiz, counts.get(String(quiz._id)) || 0));
  }
  return [...topics].map(([topic, items]) => ({ topic, quizzes: items }));
}

// FR-006: details of one published quiz; drafts and unknown ids are reported as not found.
export async function getPublishedQuiz(quizId) {
  if (!mongoose.isValidObjectId(quizId)) {
    const err = new Error('Invalid quiz id');
    err.status = 400;
    throw err;
  }
  const quiz = await Quiz.findOne({ _id: quizId, status: 'published' })
    .select('title topic durationSeconds')
    .lean();
  if (!quiz) {
    const err = new Error('Quiz not found');
    err.status = 404;
    throw err;
  }
  const questionCount = await Question.countDocuments({ quizId: quiz._id });
  return toQuizSummary(quiz, questionCount);
}
