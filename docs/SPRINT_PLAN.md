# Online Quiz System - Product Backlog and Sprint Plan

Team: Batchu Hari Nainika (PES1UG24AM461), Avyukth KV (PES1UG24AM460), Samvith Vaddiparthi (PES1UG24AM468)  
Faculty guide: Arpitha K  
Baseline documents: SRS, SAD and STP in `Project-Deliverables/`

Every backlog item is a GitHub issue in this repository and an item in the linked GitHub Project, with story points, sprint, priority and assignee. All FR, NFR and SEC requirements of the SRS are covered.

## Sprints

| Sprint   | Dates          | Goal                                                                                                                                                         | Points |
| -------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| Sprint 1 | 19-23 Oct 2026 | Working MVP: register/login, faculty create and publish a quiz, student takes and submits it and sees the score; CI running on every push and PR.            | 47     |
| Sprint 2 | 26-30 Oct 2026 | Complete product: server-enforced timer, history, leaderboards, feedback, admin roles, coverage gate, security hardening, documentation; development frozen. | 32     |

## Points per member

| Member              | Sprint 1 | Sprint 2 | Total |
| ------------------- | -------- | -------- | ----- |
| Samvith Vaddiparthi | 16       | 11       | 27    |
| Batchu Hari Nainika | 16       | 10       | 26    |
| Avyukth KV          | 15       | 11       | 26    |

## Sprint 1 backlog (19-23 Oct 2026)

| ID     | Item                                                                    | SRS                                      | Points | Assignee            | Priority |
| ------ | ----------------------------------------------------------------------- | ---------------------------------------- | ------ | ------------------- | -------- |
| OQS-01 | Project scaffold: React client, Express API, MongoDB connection         | SEC-005, NFR-006                         | 3      | Samvith Vaddiparthi | High     |
| OQS-02 | CI pipeline in GitHub Actions: install, lint, format check, test, build | FR-028, FR-029                           | 3      | Samvith Vaddiparthi | High     |
| OQS-03 | Protect main: PR-only merges with review and passing CI; PR template    | FR-027                                   | 1      | Samvith Vaddiparthi | High     |
| OQS-04 | Student registration                                                    | FR-001, SEC-001, NFR-005                 | 3      | Batchu Hari Nainika | High     |
| OQS-05 | Login, session and logout (JWT with tokenVersion)                       | FR-002, FR-003, SEC-002                  | 5      | Batchu Hari Nainika | High     |
| OQS-06 | Role-based access control for student, faculty and administrator        | FR-004                                   | 3      | Batchu Hari Nainika | High     |
| OQS-07 | Quiz and question models with authoring API                             | FR-008, FR-009, FR-010                   | 5      | Avyukth KV          | High     |
| OQS-08 | Publish and unpublish quizzes with validation                           | FR-011, FR-012                           | 3      | Avyukth KV          | High     |
| OQS-09 | Quiz Management page for faculty and administrators                     | FR-008, FR-009, FR-010, FR-011, FR-012   | 5      | Avyukth KV          | High     |
| OQS-10 | Quiz discovery: topics list and quiz details                            | FR-005, FR-006, SEC-003                  | 3      | Samvith Vaddiparthi | High     |
| OQS-11 | Start or resume an attempt; Take Quiz page with saved answers           | FR-013, FR-014, FR-015, SO-02            | 5      | Samvith Vaddiparthi | High     |
| OQS-12 | Submit attempt, automatic scoring and result page                       | FR-016, FR-019, FR-020, NFR-002, SEC-003 | 5      | Batchu Hari Nainika | High     |
| OQS-13 | Site pages and navigation: Home, About, Contact, Feedback               | FR-007, NFR-004                          | 2      | Avyukth KV          | Medium   |
| OQS-14 | Sprint 1 demo video (1 minute) uploaded to the repo                     | -                                        | 1      | Samvith Vaddiparthi | High     |

## Sprint 2 backlog (26-30 Oct 2026)

| ID     | Item                                                                   | SRS                                      | Points | Assignee            | Priority |
| ------ | ---------------------------------------------------------------------- | ---------------------------------------- | ------ | ------------------- | -------- |
| OQS-15 | Server-enforced timer: auto-finalize at expiry and reject late updates | FR-017, FR-018, NFR-003                  | 5      | Samvith Vaddiparthi | High     |
| OQS-16 | My Scores: history of completed attempts                               | FR-021                                   | 2      | Batchu Hari Nainika | Medium   |
| OQS-17 | Per-quiz leaderboard with deterministic tie-break                      | FR-022, FR-023                           | 3      | Avyukth KV          | Medium   |
| OQS-18 | Feedback submission and administrator feedback review                  | FR-024, FR-025                           | 3      | Batchu Hari Nainika | Medium   |
| OQS-19 | Administrator user and role management                                 | FR-026                                   | 3      | Avyukth KV          | Medium   |
| OQS-20 | Test and coverage reports as CI artifacts; 80% coverage gate           | FR-030, FR-031, NFR-007                  | 5      | Samvith Vaddiparthi | High     |
| OQS-21 | Security hardening: input validation, dependency audit, secret hygiene | SEC-004, SEC-005, SEC-006, FR-031, SO-01 | 3      | Batchu Hari Nainika | High     |
| OQS-22 | Responsive and accessible UI pass                                      | NFR-004, NFR-005                         | 2      | Avyukth KV          | Medium   |
| OQS-23 | Performance and concurrency check                                      | NFR-001, NFR-002                         | 3      | Avyukth KV          | Medium   |
| OQS-24 | Documentation: README, API docs and deviations log                     | NFR-006                                  | 2      | Batchu Hari Nainika | Medium   |
| OQS-25 | Sprint 2 demo video (2 minutes), freeze development and tag v1.0       | -                                        | 1      | Samvith Vaddiparthi | High     |

## Requirement coverage

| SRS item | Backlog item(s) |
| -------- | --------------- |
| FR-001   | OQS-04          |
| FR-002   | OQS-05          |
| FR-003   | OQS-05          |
| FR-004   | OQS-06          |
| FR-005   | OQS-10          |
| FR-006   | OQS-10          |
| FR-007   | OQS-13          |
| FR-008   | OQS-07, OQS-09  |
| FR-009   | OQS-07, OQS-09  |
| FR-010   | OQS-07, OQS-09  |
| FR-011   | OQS-08, OQS-09  |
| FR-012   | OQS-08, OQS-09  |
| FR-013   | OQS-11          |
| FR-014   | OQS-11          |
| FR-015   | OQS-11          |
| FR-016   | OQS-12          |
| FR-017   | OQS-15          |
| FR-018   | OQS-15          |
| FR-019   | OQS-12          |
| FR-020   | OQS-12          |
| FR-021   | OQS-16          |
| FR-022   | OQS-17          |
| FR-023   | OQS-17          |
| FR-024   | OQS-18          |
| FR-025   | OQS-18          |
| FR-026   | OQS-19          |
| FR-027   | OQS-03          |
| FR-028   | OQS-02          |
| FR-029   | OQS-02          |
| FR-030   | OQS-20          |
| FR-031   | OQS-20, OQS-21  |
| NFR-001  | OQS-23          |
| NFR-002  | OQS-12, OQS-23  |
| NFR-003  | OQS-15          |
| NFR-004  | OQS-13, OQS-22  |
| NFR-005  | OQS-04, OQS-22  |
| NFR-006  | OQS-01, OQS-24  |
| NFR-007  | OQS-20          |
| SEC-001  | OQS-04          |
| SEC-002  | OQS-05          |
| SEC-003  | OQS-10, OQS-12  |
| SEC-004  | OQS-21          |
| SEC-005  | OQS-01, OQS-21  |
| SEC-006  | OQS-21          |
| SO-01    | OQS-21          |
| SO-02    | OQS-11          |

## Workflow

1. Pick an item assigned to you and move it to **In Progress** on the Project board.
2. Create a branch from the latest `main`: `feature/OQS-xx-short-name`.
3. Commit in small steps with messages like `OQS-05: add logout endpoint (FR-003)`.
4. Push and open a pull request into `main`; write `Closes #<issue number>` in the description.
5. CI must pass; the repo owner reviews and merges (the owner's own PRs are approved by another member).
6. The issue closes automatically and the item moves to **Done**.

## Definition of Done

- Code follows the SRS, SAD and STP (any deviation recorded in `docs/DEVIATIONS.md`)
- Automated tests added; test names start with the STP test case ID
- CI is green on the pull request
- PR raised by the assignee, reviewed and approved, merged into `main` with `Closes #<issue>`
