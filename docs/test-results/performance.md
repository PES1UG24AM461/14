# Performance and concurrency results (OQS-23)

Date: 14 Nov 2026. Branch `feature/OQS-23-performance`.

## Setup

- **Target:** the real API (`createApp()`) started by `server/perf/server.js` on an in-memory MongoDB
  seeded with 50 students, 100 published quizzes and 5 questions per quiz. The shared Atlas database is
  never used, so the test is repeatable and leaves no data behind.
- **Load:** [k6](https://k6.io) 2.4, script `perf/load-test.js`, 50 virtual users for 5 minutes. Each
  user logs in once, then repeats the STP TC-PERF-01 flow with a new quiz each time: list quizzes, open
  the quiz, start it, save two answers, submit, view the result, view the leaderboard (1 s pause between
  steps).
- **Machine:** one MacBook Air (Apple silicon) running both k6 and the API, Node 22, one API process.
- Passwords are hashed with bcrypt cost 12, as in registration, so login timings are realistic.

How to repeat:

```bash
cd server && PERF_PASSWORD=<any 8+ characters> node perf/server.js
```

```bash
k6 run -e PERF_PASSWORD=<same> perf/load-test.js            # all 50 start in the same second
k6 run -e PERF_PASSWORD=<same> -e RAMP=1 perf/load-test.js  # students arrive over the first minute
```

## TC-PERF-01 (NFR-001): p95 response time at 50 concurrent users

| Run                                      | Requests | Failed | p95 all requests | Result |
| ---------------------------------------- | -------- | ------ | ---------------- | ------ |
| A: students arrive over the first minute | 13,250   | 0      | 200 ms           | Pass   |
| B: all 50 log in at the same second      | 14,506   | 0      | 24 ms            | Pass   |

p95 for each step:

| Step          | Run A  | Run B      |
| ------------- | ------ | ---------- |
| Login         | 329 ms | **13.6 s** |
| List quizzes  | 195 ms | 20 ms      |
| Open quiz     | 198 ms | 16 ms      |
| Start attempt | 207 ms | 25 ms      |
| Save answer   | 200 ms | 25 ms      |
| Submit        | 201 ms | 26 ms      |
| Result        | 197 ms | 20 ms      |
| Leaderboard   | 200 ms | 24 ms      |

**NFR-001 is met in both runs** (p95 of all requests well under 2 s, no failed requests).

### Finding: simultaneous logins queue up

When all 50 students press "Log in" in the same second (run B), logins take up to 14 s. Each login
checks the password with bcrypt cost 12, about 0.3 s of CPU, and the `bcryptjs` library runs that on
Node's single main thread, so 50 checks run one after another. Once students are logged in, every
other request stays fast. In run A, where arrivals are spread over a minute, a login takes about
0.3 s and the other requests wait at most about 0.2 s behind one.

Not changed in this story, because it affects login (OQS-05) and the stored password hashes. Options if
the team wants to fix it: switch to the native `bcrypt` package, which hashes on a thread pool; or run
`bcryptjs` in a worker thread. Lowering the cost factor would weaken password storage (SEC-001), so it
is not recommended.

## TC-PERF-02 and TC-ATT-07 (NFR-002): duplicate-submit safety

Automated tests in `server/tests/concurrency.test.js` (run in CI):

| TC ID      | Scenario                                                            | Result                                                      |
| ---------- | ------------------------------------------------------------------- | ----------------------------------------------------------- |
| TC-ATT-07  | One attempt submitted five times at once                            | Pass: one finalized attempt, same score and submission time |
| TC-PERF-02 | 50 students submit the same quiz at the same moment, each one twice | Pass: 50 finalized attempts, one per student, correct score |

The load test agrees: 1,807 attempts started, saved and submitted in run B with no failed request.

## Indexes (SAD 5, NFR-001)

Checked by tests in `server/tests/concurrency.test.js`:

- `Question.quizId`: used to load and score a quiz's questions.
- `Attempt (userId, quizId)`, unique: one attempt per student per quiz.
- `Attempt (quizId, status, score, submittedAt)`, added in OQS-17: the leaderboard query uses this
  index (`IXSCAN`, no `COLLSCAN`).
