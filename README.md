# Online Quiz System

![CI](https://github.com/PES1UG24AM461/14/actions/workflows/ci.yml/badge.svg)

A browser-based quiz platform where students register, log in, browse quizzes by topic, attempt each quiz once under a
server-enforced timer, receive automatically calculated scores and view per-quiz leaderboards. Faculty and administrators
create and publish quizzes; administrators manage roles and review feedback.

**Stack:** React + Vite · Node.js + Express · MongoDB + Mongoose · JWT + bcryptjs · Vitest, React Testing Library, Supertest · GitHub Actions

## Team

| Member              | SRN           | Role                                   |
| ------------------- | ------------- | -------------------------------------- |
| Batchu Hari Nainika | PES1UG24AM461 | SRS owner, developer                   |
| Avyukth KV          | PES1UG24AM460 | SAD owner, developer                   |
| Samvith Vaddiparthi | PES1UG24AM468 | STP owner, repository owner, developer |

Faculty guide: Arpitha K · Software Engineering, Section H

## Project documents

| Document                            | File                                                                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Software Requirements Specification | [Project-Deliverables/Online_Quiz_System_SRS_Revised.docx](Project-Deliverables/Online_Quiz_System_SRS_Revised.docx)     |
| Software Architecture and Design    | [Project-Deliverables/Online_Quiz_System_SAD_Revised.docx](Project-Deliverables/Online_Quiz_System_SAD_Revised.docx)     |
| Software Test Plan                  | [Project-Deliverables/Online_Quiz_System_STP_Revised-2.docx](Project-Deliverables/Online_Quiz_System_STP_Revised-2.docx) |
| Product backlog and sprint plan     | [docs/SPRINT_PLAN.md](docs/SPRINT_PLAN.md)                                                                               |

The backlog is tracked as GitHub issues in this repository and in the linked GitHub Project (story points, sprint, priority, assignee).

## Sprints

| Sprint   | Dates          | Outcome                                             |
| -------- | -------------- | --------------------------------------------------- |
| Sprint 1 | 19-23 Oct 2026 | Working MVP; demo video in `docs/sprint-videos/`    |
| Sprint 2 | 26-30 Oct 2026 | Complete product, documentation, development frozen |

## Contributing

All changes go through a feature branch and a pull request into `main`; CI must pass and the PR must be reviewed before merging.
See [docs/SPRINT_PLAN.md](docs/SPRINT_PLAN.md#workflow).
Differences from the submitted SRS, SAD or STP are recorded in [docs/DEVIATIONS.md](docs/DEVIATIONS.md).

## Running the project locally

**Requirements:** Node.js 22.12 or newer (22 LTS or 24), npm, and a MongoDB database
(a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster, or a local install: `brew tap mongodb/brew && brew install mongodb-community`).

```bash
git clone https://github.com/PES1UG24AM461/14.git
cd 14
npm install                         # installs client and server (npm workspaces)
cp server/.env.example server/.env  # then put your MONGODB_URI and a JWT_SECRET in server/.env
```

Run the API and the web app in two terminals:

```bash
npm run dev:server   # http://localhost:5050/api/health
npm run dev:client   # http://localhost:5173
```

Never commit `.env`; only `.env.example` (placeholders) is tracked.

## Quality checks (same as CI)

```bash
npm run lint          # ESLint (client and server)
npm run format:check  # Prettier ("npm run format" fixes formatting)
npm test              # Vitest (client and server)
npm run build         # production build of the client
```

GitHub Actions (`.github/workflows/ci.yml`) runs these on every push and pull request.

## Project structure

```
client/                 React + Vite app
  src/pages/            one component per page (Home, Login, Quiz Topics, ...)
  src/components/       shared UI components
  src/api/client.js     Axios instance (adds the JWT to requests)
server/                 Node.js + Express REST API
  src/routes/           route definitions (paths follow SAD 4.3)
  src/controllers/      request handling
  src/services/         business rules (attempts, scoring, ranking)
  src/models/           Mongoose models (SAD 4.4)
  src/middleware/       auth, roles, validation, error handling
  tests/                API tests (Supertest + Vitest)
docs/                   sprint plan, deviations log, test results, sprint videos
Project-Deliverables/   SRS, SAD and STP
```
