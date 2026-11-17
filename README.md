# Online Quiz System

![CI](https://github.com/PES1UG24AM461/14/actions/workflows/ci.yml/badge.svg)

A browser-based quiz platform where students register, log in, browse quizzes by topic, attempt each quiz once under a
server-enforced timer, receive automatically calculated scores, track score history, and view per-quiz leaderboards. Faculty and administrators
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

| Document                            | File                                                                                                                                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Software Requirements Specification | [Project-Deliverables/Online_Quiz_System_SRS_Revised.docx](Project-Deliverables/Online_Quiz_System_SRS_Revised.docx) ([PDF](Project-Deliverables/Online_Quiz_System_SRS_Revised.pdf))       |
| Software Architecture and Design    | [Project-Deliverables/Online_Quiz_System_SAD_Revised.docx](Project-Deliverables/Online_Quiz_System_SAD_Revised.docx) ([PDF](Project-Deliverables/Online_Quiz_System_SAD_Revised.pdf))       |
| Software Test Plan                  | [Project-Deliverables/Online_Quiz_System_STP_Revised-2.docx](Project-Deliverables/Online_Quiz_System_STP_Revised-2.docx) ([PDF](Project-Deliverables/Online_Quiz_System_STP_Revised-2.pdf)) |
| Product backlog and sprint plan     | [docs/SPRINT_PLAN.md](docs/SPRINT_PLAN.md)                                                                                                                                                  |
| REST API Documentation              | [docs/API.md](docs/API.md)                                                                                                                                                                  |
| Deviations from specifications      | [docs/DEVIATIONS.md](docs/DEVIATIONS.md)                                                                                                                                                    |

The backlog is tracked as GitHub issues in this repository and in the linked GitHub Project (story points, sprint, priority, assignee).

## Sprints

| Sprint   | Dates          | Outcome                                                                                                        |
| -------- | -------------- | -------------------------------------------------------------------------------------------------------------- |
| Sprint 1 | 19-23 Oct 2026 | Working MVP; demo video: [sprint1.mp4](docs/sprint-videos/sprint1.mp4)                                         |
| Sprint 2 | 26-30 Oct 2026 | Complete product, documentation, development frozen; demo video: [sprint2.mp4](docs/sprint-videos/sprint2.mp4) |

## Contributing

All changes go through a feature branch and a pull request into `main`; CI must pass and the PR must be reviewed before merging.
See [docs/SPRINT_PLAN.md](docs/SPRINT_PLAN.md#workflow).
Differences from the submitted SRS, SAD or STP are recorded in [docs/DEVIATIONS.md](docs/DEVIATIONS.md).

## Running the project locally

### Prerequisites

- **Node.js**: version `22.12` or newer (Node 22 LTS or Node 24). Check with `node -v`.
- **npm**: version `10` or newer (supports npm workspaces). Check with `npm -v`.
- **MongoDB**: a running MongoDB instance (version 6.0+ recommended), either:
  - Local installation (e.g. `brew install mongodb-community` on macOS, or MongoDB Community Server on Windows/Linux)
  - Free cloud cluster on [MongoDB Atlas](https://www.mongodb.com/atlas)

### Installation & Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/PES1UG24AM461/14.git
   cd 14
   ```

2. **Install dependencies:**
   Installs root dependencies and workspaces (`client` and `server`):

   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Copy the example environment file for the server:

   ```bash
   cp server/.env.example server/.env
   ```

   Edit `server/.env` to configure your MongoDB connection, a secure `JWT_SECRET`, and a `SEED_PASSWORD` (min 8 characters).

4. **Seed the database:**
   Populates MongoDB with preconfigured roles, accounts, and sample data. The script is idempotent and safe to re-run:

   ```bash
   npm run seed
   ```

5. **Start development servers:**
   Open two terminal windows/tabs:
   ```bash
   # Terminal 1: Backend API server (runs on http://localhost:5050)
   npm run dev:server

   # Terminal 2: Frontend client (runs on http://localhost:5173)
   npm run dev:client
   ```

### Local URLs

| Service / Page   | URL                                | Description                               |
| ---------------- | ---------------------------------- | ----------------------------------------- |
| Frontend Web App | `http://localhost:5173`            | Single-page React application             |
| Backend API Base | `http://localhost:5050/api`        | Express REST API root                     |
| API Health Check | `http://localhost:5050/api/health` | Server liveness check (`{"status":"ok"}`) |

## Environment variables

Never commit `.env` files; only `.env.example` templates are tracked in Git.

### Server (`server/.env`)

| Variable                | Required | Default / Example Value                        | Description                                                          |
| ----------------------- | -------- | ---------------------------------------------- | -------------------------------------------------------------------- |
| `PORT`                  | No       | `5050`                                         | Port for the Express REST API server                                 |
| `MONGODB_URI`           | Yes      | `mongodb://127.0.0.1:27017/online_quiz_system` | MongoDB connection string                                            |
| `JWT_SECRET`            | Yes      | `replace-with-a-long-random-string`            | Secret key used to sign and verify HMAC SHA-256 JWT tokens           |
| `JWT_EXPIRES_IN`        | No       | `1h`                                           | Token expiration window (e.g., `1h`, `7d`)                           |
| `CLIENT_ORIGIN`         | No       | `http://localhost:5173`                        | Allowed CORS origin for frontend requests                            |
| `SEED_PASSWORD`         | Yes      | `replace-with-a-secure-seed-password`          | Default password assigned to seed accounts (8-128 characters)        |
| `SEED_ADMIN_PASSWORD`   | No       | Unset (falls back to `SEED_PASSWORD`)          | Optional specific password override for seeded administrator account |
| `SEED_FACULTY_PASSWORD` | No       | Unset (falls back to `SEED_PASSWORD`)          | Optional specific password override for seeded faculty accounts      |
| `SEED_STUDENT_PASSWORD` | No       | Unset (falls back to `SEED_PASSWORD`)          | Optional specific password override for seeded student accounts      |

### Client (`client/.env`)

| Variable       | Required | Default / Example Value | Description                                                                                                |
| -------------- | -------- | ----------------------- | ---------------------------------------------------------------------------------------------------------- |
| `VITE_API_URL` | No       | (empty string)          | Optional base API URL. When unset in development, Vite proxies `/api` requests to `http://localhost:5050`. |

## Verified local seed accounts

Running `npm run seed` creates or updates 8 standard accounts across all 3 roles. All accounts use the password defined by `SEED_PASSWORD` in `server/.env`:

| Role            | Name                 | Email                  | Initial Permissions & Scope                                    |
| --------------- | -------------------- | ---------------------- | -------------------------------------------------------------- |
| `administrator` | System Administrator | `admin@example.com`    | Role assignment, user administration, feedback review, quizzes |
| `faculty`       | Dr. Ramesh Kumar     | `faculty1@example.com` | Create, edit, manage, publish, and delete authored quizzes     |
| `faculty`       | Prof. Anita Sharma   | `faculty2@example.com` | Create, edit, manage, publish, and delete authored quizzes     |
| `student`       | Student One          | `student1@example.com` | Browse quizzes, start timed attempts, submit answers, feedback |
| `student`       | Student Two          | `student2@example.com` | Browse quizzes, start timed attempts, submit answers, feedback |
| `student`       | Student Three        | `student3@example.com` | Browse quizzes, start timed attempts, submit answers, feedback |
| `student`       | Student Four         | `student4@example.com` | Browse quizzes, start timed attempts, submit answers, feedback |
| `student`       | Student Five         | `student5@example.com` | Browse quizzes, start timed attempts, submit answers, feedback |

## Available scripts

All major lifecycle, quality, and development commands are runnable from the repository root:

| Command                           | Scope             | Description                                                                   |
| --------------------------------- | ----------------- | ----------------------------------------------------------------------------- |
| `npm run dev:client`              | Client            | Starts Vite frontend development server on port 5173 with hot reload          |
| `npm run dev:server`              | Server            | Starts Express API server on port 5050 with Node.js `--watch` file monitoring |
| `npm run seed`                    | Server            | Idempotently populates MongoDB with initial seed users and roles              |
| `npm run lint`                    | Client & Server   | Runs ESLint across client and server source files                             |
| `npm run format`                  | Root & Workspaces | Formats all repository files using Prettier                                   |
| `npm run format:check`            | Root & Workspaces | Verifies code formatting across all files against Prettier rules              |
| `npm test`                        | Client & Server   | Runs all frontend and backend Vitest test suites                              |
| `npm run test:coverage -w client` | Client            | Runs client test suites and enforces the 80% statement coverage gate          |
| `npm run test:coverage -w server` | Server            | Runs server test suites and enforces the 80% statement coverage gate          |
| `npm run build`                   | Client            | Compiles and builds production client assets in `client/dist/`                |

## Quality checks (same as CI)

```bash
npm run lint          # ESLint (client and server)
npm run format:check  # Prettier ("npm run format" fixes formatting)
npm test              # Vitest (client and server)
npm run test:coverage -w client   # client tests with the 80% statement coverage gate
npm run test:coverage -w server   # server tests with the 80% statement coverage gate
npm run build         # production build of the client
```

GitHub Actions (`.github/workflows/ci.yml`) runs these on every pull request and every push to `main`, along with
`npm audit --audit-level=high`. CI fails if statement coverage drops below 80% for the client or the server.
Each run uploads `client-reports` and `server-reports` artifacts (JUnit test results, HTML/LCOV coverage, ESLint
report and, for the server, the npm audit report); open the run on the Actions tab and scroll to **Artifacts**.

## Project structure

```
client/                 React + Vite app
  src/pages/            one component per page (Home, Login, Quiz Topics, ...)
  src/components/       shared UI components
  src/api/client.js     Axios instance (adds the JWT to requests)
server/                 Node.js + Express REST API
  src/routes/           route definitions (paths follow SAD 4.3; documented in docs/API.md)
  src/controllers/      request handling
  src/services/         business rules (attempts, scoring, ranking)
  src/models/           Mongoose models (SAD 4.4)
  src/middleware/       auth, roles, validation, error handling
  tests/                API tests (Supertest + Vitest)
docs/                   sprint plan, deviations log, API documentation, sprint videos
  API.md                comprehensive REST API documentation (all 26 endpoints)
  DEVIATIONS.md         tracked specification deviations and architectural decisions
Project-Deliverables/   SRS, SAD and STP deliverables
```

## Dependency Audit Policy

The CI pipeline runs `npm audit --audit-level=high` on every push and pull‑request.
If any high‑ or critical‑severity vulnerability is reported, the audit step exits with a non‑zero status and the pipeline fails. The failure must be resolved before the change can be merged, ensuring that no vulnerable dependencies are shipped.
