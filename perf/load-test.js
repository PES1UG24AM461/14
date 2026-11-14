// OQS-23 / TC-PERF-01 (NFR-001): 50 concurrent students for 5 minutes running the STP flow:
// log in, list quizzes, open a quiz, start it, save answers, submit, view the result and the leaderboard.
// Each iteration takes the next quiz, because a student may attempt a quiz only once.
//
//   k6 run -e PERF_PASSWORD=<same as perf/server.js> perf/load-test.js
// Optional: -e BASE_URL=http://localhost:5055/api -e DURATION=5m -e VUS=50
import http from 'k6/http';
import { check, fail, sleep } from 'k6';
import { Counter } from 'k6/metrics';

const BASE = __ENV.BASE_URL || 'http://localhost:5055/api';
const PASSWORD = __ENV.PERF_PASSWORD;
const unexpected = new Counter('unexpected_responses');

export const options = {
  // Default: all 50 students start at the same second (worst case, as in the STP).
  // -e RAMP=1: students arrive over the first minute, as at the start of a class, then stay 4 minutes.
  scenarios: {
    students: __ENV.RAMP
      ? {
          executor: 'ramping-vus',
          startVUs: 0,
          stages: [
            { duration: '1m', target: Number(__ENV.VUS || 50) },
            { duration: '4m', target: Number(__ENV.VUS || 50) },
          ],
        }
      : {
          executor: 'constant-vus',
          vus: Number(__ENV.VUS || 50),
          duration: __ENV.DURATION || '5m',
        },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'], // NFR-001
    // Per-step thresholds, so the summary also reports p95 for each step of the flow.
    'http_req_duration{name:login}': ['p(95)<2000'],
    'http_req_duration{name:list quizzes}': ['p(95)<2000'],
    'http_req_duration{name:open quiz}': ['p(95)<2000'],
    'http_req_duration{name:start attempt}': ['p(95)<2000'],
    'http_req_duration{name:save answer}': ['p(95)<2000'],
    'http_req_duration{name:submit}': ['p(95)<2000'],
    'http_req_duration{name:result}': ['p(95)<2000'],
    'http_req_duration{name:leaderboard}': ['p(95)<2000'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

const json = { headers: { 'Content-Type': 'application/json' } };
let token = null;

function auth(name) {
  return {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    tags: { name },
  };
}

function expect(res, status, label) {
  const ok = check(res, { [`${label} ${status}`]: (r) => r.status === status });
  if (!ok) {
    unexpected.add(1, { step: label, status: String(res.status) });
    console.warn(`${label}: HTTP ${res.status} ${res.body ? String(res.body).slice(0, 120) : ''}`);
  }
  return ok;
}

export default function () {
  if (!PASSWORD) fail('Set -e PERF_PASSWORD to the password used by perf/server.js');

  if (!token) {
    const res = http.post(
      `${BASE}/auth/login`,
      JSON.stringify({ email: `perf.student${__VU}@example.test`, password: PASSWORD }),
      { ...json, tags: { name: 'login' } }
    );
    if (!expect(res, 200, 'login')) return;
    token = res.json('token');
    sleep(1);
  }

  const list = http.get(`${BASE}/quizzes`, auth('list quizzes'));
  if (!expect(list, 200, 'list quizzes')) return;
  const quizzes = list.json('topics').flatMap((t) => t.quizzes);
  const quiz = quizzes[__ITER % quizzes.length];
  sleep(1);

  expect(http.get(`${BASE}/quizzes/${quiz.id}`, auth('open quiz')), 200, 'open quiz');
  sleep(1);

  const start = http.post(`${BASE}/quizzes/${quiz.id}/attempts`, null, auth('start attempt'));
  if (!expect(start, 201, 'start attempt')) return;
  const attemptId = start.json('attempt.id');
  const questions = start.json('questions');
  sleep(1);

  for (const q of questions.slice(0, 2)) {
    const body = JSON.stringify({ answers: [{ questionId: q.id, selectedOption: 1 }] });
    expect(
      http.patch(`${BASE}/attempts/${attemptId}/answers`, body, auth('save answer')),
      200,
      'save answer'
    );
    sleep(1);
  }

  expect(http.post(`${BASE}/attempts/${attemptId}/submit`, null, auth('submit')), 200, 'submit');
  sleep(1);

  expect(http.get(`${BASE}/attempts/${attemptId}/result`, auth('result')), 200, 'result');
  sleep(1);

  expect(
    http.get(`${BASE}/quizzes/${quiz.id}/leaderboard`, auth('leaderboard')),
    200,
    'leaderboard'
  );
  sleep(1);
}
