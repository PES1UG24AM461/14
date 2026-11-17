# Online Quiz System — REST API Documentation

This document describes all HTTP endpoints implemented by the Express API in `server/src/routes/`.
The API base path for all endpoints is `/api`.

---

## Table of Contents

1. [Architecture & Standards](#architecture--standards)
2. [Health](#1-health)
3. [Authentication & Session](#2-authentication--session)
4. [Role Information](#3-role-information)
5. [Quiz Discovery (Public)](#4-quiz-discovery-public)
6. [Quiz Authoring & Management (Staff)](#5-quiz-authoring--management-staff)
7. [Quiz Attempts, Scoring & History (Student)](#6-quiz-attempts-scoring--history-student)
8. [Quiz Leaderboards (Authenticated)](#7-quiz-leaderboards-authenticated)
9. [User & Role Administration (Administrator)](#8-user--role-administration-administrator)
10. [Feedback (Users & Administrator)](#9-feedback-users--administrator)
11. [Route Inventory & Verification](#10-route-inventory--verification)

---

## Architecture & Standards

- **Base URL:** `http://localhost:5050/api` (proxied in development by Vite at `http://localhost:5173/api`)
- **Format:** Requests and responses use `application/json; charset=utf-8`
- **Authentication:** Bearer token in the `Authorization` header (`Authorization: Bearer <jwt-token>`). Tokens are signed using HMAC-SHA256 with the secret in `JWT_SECRET`.
- **Role Model (RBAC):** Three user roles: `student`, `faculty`, and `administrator`.
  - `student`: Browse published quizzes, start/resume attempts, save answers, submit attempts, view results, submit feedback.
  - `faculty`: Author, edit, delete, publish, and unpublish own quizzes; view own managed quizzes; submit feedback.
  - `administrator`: Full quiz management across all owners, user role promotion/demotion, feedback review, submit feedback.

### Standard Error Response Format

Errors return a JSON object with an `error` message string:

```json
{
  "error": "Descriptive error message"
}
```

Common status codes:

- `400 Bad Request`: Malformed JSON, missing required fields, or invalid ObjectId parameter.
- `401 Unauthorized`: Missing, invalid, or expired JWT token.
- `403 Forbidden`: Authenticated user does not possess the required role or resource ownership.
- `404 Not Found`: Target resource does not exist or is not available.
- `409 Conflict`: Business state conflict (e.g., duplicate registration email, attempting to edit/delete a published quiz, or retaking a finalized quiz).
- `422 Unprocessable Entity`: Input validation failure (e.g., rating out of range, empty question list on publish, invalid role).
- `503 Service Unavailable`: Required service configuration (e.g. `JWT_SECRET`) is missing.

---

## 1. Health

### `GET /api/health`

- **Access:** Public (no authentication required)
- **Description:** Liveness and database connectivity probe used by developers, local tooling, and CI workflows.
- **Request:**
  - Headers: None required
  - Body: None
- **Success Response:**
  - Status: `200 OK`
  - Body:
    ```json
    {
      "status": "ok",
      "database": "connected"
    }
    ```
    _(Database values: `"connected"`, `"connecting"`, `"disconnecting"`, `"disconnected"`, or `"unknown"`)_

---

## 2. Authentication & Session

### `POST /api/auth/register`

- **Access:** Public (no authentication required)
- **Description:** Registers a new student account. Role is strictly assigned as `student`.
- **Request:**
  - Headers: `Content-Type: application/json`
  - Body:
    ```json
    {
      "name": "Jane Student",
      "email": "jane@example.com",
      "password": "Password123!"
    }
    ```
  - Validation:
    - `name`: string, 2 to 100 characters after trimming.
    - `email`: string, max 254 characters, valid email format regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`.
    - `password`: string, 8 to 128 characters.
- **Success Response:**
  - Status: `201 Created`
  - Body:
    ```json
    {
      "message": "Registration successful",
      "user": {
        "id": "673620000000000000000001",
        "name": "Jane Student",
        "email": "jane@example.com",
        "role": "student"
      }
    }
    ```
- **Error Responses:**
  - `400 Bad Request`:
    - `{ "error": "Name, email and password are required" }`
    - `{ "error": "Name must contain between 2 and 100 characters" }`
    - `{ "error": "A valid email is required" }`
    - `{ "error": "Password must contain between 8 and 128 characters" }`
    - `{ "error": "Invalid registration details" }`
  - `409 Conflict`:
    - `{ "error": "Email is already registered" }`

### `POST /api/auth/login`

- **Access:** Public (no authentication required)
- **Description:** Authenticates credentials and returns a signed JWT alongside the user profile.
- **Request:**
  - Headers: `Content-Type: application/json`
  - Body:
    ```json
    {
      "email": "jane@example.com",
      "password": "Password123!"
    }
    ```
- **Success Response:**
  - Status: `200 OK`
  - Body:
    ```json
    {
      "message": "Login successful",
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "673620000000000000000001",
        "name": "Jane Student",
        "email": "jane@example.com",
        "role": "student"
      }
    }
    ```
- **Error Responses:**
  - `400 Bad Request`: `{ "error": "Email and password are required" }`
  - `401 Unauthorized`: `{ "error": "Invalid email or password" }` (returns uniform message for unknown emails and bad passwords to prevent enumeration)
  - `503 Service Unavailable`: `{ "error": "Authentication is temporarily unavailable" }` (missing `JWT_SECRET`)

### `POST /api/auth/logout`

- **Access:** Authenticated user
- **Description:** Invalidates the current session token by incrementing the user's `tokenVersion` counter in the database.
- **Request:**
  - Headers: `Authorization: Bearer <token>`
  - Body: None
- **Success Response:**
  - Status: `200 OK`
  - Body:
    ```json
    {
      "message": "Logout successful"
    }
    ```
- **Error Responses:**
  - `401 Unauthorized`: `{ "error": "Authentication required" }` or `{ "error": "Invalid or expired token" }`

---

## 3. Role Information

### `GET /api/roles/me`

- **Access:** Authenticated user (any role)
- **Description:** Returns the authenticated caller's identity and role.
- **Request:**
  - Headers: `Authorization: Bearer <token>`
- **Success Response:**
  - Status: `200 OK`
  - Body:
    ```json
    {
      "user": {
        "id": "673620000000000000000001",
        "name": "Jane Student",
        "email": "jane@example.com",
        "role": "student"
      }
    }
    ```
- **Error Responses:**
  - `401 Unauthorized`: `{ "error": "Authentication required" }`

### `GET /api/roles/quiz-management`

- **Access:** Authenticated user with role `faculty` or `administrator`
- **Description:** Probes whether caller has staff authorization to access quiz authoring and management features.
- **Request:**
  - Headers: `Authorization: Bearer <token>`
- **Success Response:**
  - Status: `200 OK`
  - Body:
    ```json
    {
      "message": "Access granted to quiz management",
      "role": "faculty"
    }
    ```
- **Error Responses:**
  - `401 Unauthorized`: `{ "error": "Authentication required" }`
  - `403 Forbidden`: `{ "error": "Forbidden: insufficient role" }`

### `GET /api/roles/administration`

- **Access:** Authenticated user with role `administrator`
- **Description:** Probes whether caller has administrative authorization.
- **Request:**
  - Headers: `Authorization: Bearer <token>`
- **Success Response:**
  - Status: `200 OK`
  - Body:
    ```json
    {
      "message": "Access granted to administration",
      "role": "administrator"
    }
    ```
- **Error Responses:**
  - `401 Unauthorized`: `{ "error": "Authentication required" }`
  - `403 Forbidden`: `{ "error": "Forbidden: insufficient role" }`

---

## 4. Quiz Discovery (Public)

### `GET /api/quizzes`

- **Access:** Public (no authentication required)
- **Description:** Returns published quizzes grouped under their topic headers. Never exposes draft quizzes, questions, or answer keys.
- **Request:** None
- **Success Response:**
  - Status: `200 OK`
  - Body:
    ```json
    {
      "topics": [
        {
          "topic": "Programming",
          "quizzes": [
            {
              "id": "673620000000000000000010",
              "title": "JavaScript Basics",
              "durationSeconds": 600,
              "questionCount": 5
            }
          ]
        }
      ]
    }
    ```

### `GET /api/quizzes/:quizId`

- **Access:** Public (no authentication required)
- **Description:** Returns metadata for a published quiz. Questions and answer keys are omitted.
- **Request:**
  - Parameters: `quizId` (MongoDB ObjectId string in URL)
- **Success Response:**
  - Status: `200 OK`
  - Body:
    ```json
    {
      "quiz": {
        "id": "673620000000000000000010",
        "title": "JavaScript Basics",
        "topic": "Programming",
        "durationSeconds": 600,
        "questionCount": 5
      }
    }
    ```
- **Error Responses:**
  - `400 Bad Request`: `{ "error": "Invalid quiz id" }` (malformed ObjectId)
  - `404 Not Found`: `{ "error": "Quiz not found" }` (quiz does not exist or status is draft)

---

## 5. Quiz Authoring & Management (Staff)

All routes in this section require authentication with role `faculty` or `administrator`.

### `GET /api/manage/quizzes`

- **Access:** `faculty` (views own quizzes) or `administrator` (views all quizzes)
- **Description:** Lists quizzes manageable by the caller, including draft quizzes.
- **Success Response:**
  - Status: `200 OK`
  - Body:
    ```json
    {
      "quizzes": [
        {
          "id": "673620000000000000000010",
          "title": "JavaScript Basics",
          "topic": "Programming",
          "durationSeconds": 600,
          "status": "published",
          "questionCount": 5,
          "createdAt": "2026-11-01T10:00:00.000Z",
          "updatedAt": "2026-11-01T10:30:00.000Z"
        }
      ]
    }
    ```
- **Error Responses:**
  - `401 Unauthorized`: `{ "error": "Authentication required" }`
  - `403 Forbidden`: `{ "error": "Faculty or administrators only" }`

### `GET /api/manage/quizzes/:quizId`

- **Access:** Quiz owner (`faculty`) or `administrator`
- **Description:** Retrieves full quiz definition including questions and server-side `correctOption` indexes for editing.
- **Request:**
  - Parameters: `quizId` (MongoDB ObjectId)
- **Success Response:**
  - Status: `200 OK`
  - Body:
    ```json
    {
      "quiz": {
        "id": "673620000000000000000010",
        "title": "JavaScript Basics",
        "topic": "Programming",
        "durationSeconds": 600,
        "status": "draft",
        "questions": [
          {
            "id": "673620000000000000000020",
            "prompt": "Which keyword declares a block-scoped variable?",
            "options": ["var", "let", "function", "set"],
            "correctOption": 1
          }
        ]
      }
    }
    ```
- **Error Responses:**
  - `400 Bad Request`: `{ "error": "Invalid quiz id" }`
  - `401 Unauthorized`: `{ "error": "Authentication required" }`
  - `403 Forbidden`: `{ "error": "Faculty or administrators only" }` or `{ "error": "Not your quiz" }`
  - `404 Not Found`: `{ "error": "Quiz not found" }`

### `POST /api/quizzes`

- **Access:** `faculty` or `administrator`
- **Description:** Creates a new draft quiz with optional questions.
- **Request:**
  - Body:
    ```json
    {
      "title": "Python Data Structures",
      "topic": "Programming",
      "durationSeconds": 900,
      "questions": [
        {
          "prompt": "Which Python collection is ordered and immutable?",
          "options": ["list", "tuple", "dict", "set"],
          "correctOption": 1
        }
      ]
    }
    ```
  - Validation:
    - `title`: string, 1 to 200 characters.
    - `topic`: string, 1 to 100 characters.
    - `durationSeconds`: integer, between 60 (1 min) and 14400 (4 hours).
    - `questions`: optional array of questions. Each question must have `prompt` (string, max 1000 chars), `options` (2 to 6 non-empty strings), and `correctOption` (integer index between 0 and `options.length - 1`).
- **Success Response:**
  - Status: `201 Created`
  - Body:
    ```json
    {
      "quiz": {
        "id": "673620000000000000000015",
        "title": "Python Data Structures",
        "topic": "Programming",
        "durationSeconds": 900,
        "status": "draft",
        "questions": [
          {
            "id": "673620000000000000000025",
            "prompt": "Which Python collection is ordered and immutable?",
            "options": ["list", "tuple", "dict", "set"],
            "correctOption": 1
          }
        ]
      }
    }
    ```
- **Error Responses:**
  - `400 Bad Request`: Schema validation error
  - `401 Unauthorized` / `403 Forbidden`
  - `422 Unprocessable Entity`: Field validation failures (e.g. invalid duration or options range)

### `PATCH /api/quizzes/:quizId`

- **Access:** Quiz owner (`faculty`) or `administrator`
- **Description:** Edits a draft quiz. Published quizzes cannot be modified (unpublish first).
- **Request:**
  - Parameters: `quizId` (MongoDB ObjectId)
  - Body: Partial fields `{ "title"?: "...", "topic"?: "...", "durationSeconds"?: 1200, "questions"?: [ ... ] }`
- **Success Response:**
  - Status: `200 OK`
  - Body: `{ "quiz": { "id": "...", "title": "...", "status": "draft", ... } }`
- **Error Responses:**
  - `400 Bad Request`: `{ "error": "Invalid quiz id" }`
  - `401 Unauthorized` / `403 Forbidden`
  - `404 Not Found`: `{ "error": "Quiz not found" }`
  - `409 Conflict`: `{ "error": "Cannot edit a published quiz; unpublish it first" }`
  - `422 Unprocessable Entity`: Validation failure on questions or duration

### `DELETE /api/quizzes/:quizId`

- **Access:** Quiz owner (`faculty`) or `administrator`
- **Description:** Deletes a draft quiz and its associated question records.
- **Request:**
  - Parameters: `quizId` (MongoDB ObjectId)
- **Success Response:**
  - Status: `204 No Content` (Empty body)
- **Error Responses:**
  - `400 Bad Request`: `{ "error": "Invalid quiz id" }`
  - `401 Unauthorized` / `403 Forbidden`
  - `404 Not Found`: `{ "error": "Quiz not found" }`
  - `409 Conflict`: `{ "error": "Cannot delete a published quiz; unpublish it first" }`

### `POST /api/quizzes/:quizId/publish`

- **Access:** Quiz owner (`faculty`) or `administrator`
- **Description:** Validates and publishes a complete quiz, making it visible to students. Requires at least one question.
- **Request:**
  - Parameters: `quizId` (MongoDB ObjectId)
- **Success Response:**
  - Status: `200 OK`
  - Body: `{ "quiz": { "id": "...", "status": "published", ... } }`
- **Error Responses:**
  - `400 Bad Request`: `{ "error": "Invalid quiz id" }`
  - `401 Unauthorized` / `403 Forbidden`
  - `404 Not Found`: `{ "error": "Quiz not found" }`
  - `422 Unprocessable Entity`: `{ "error": "A published quiz must contain at least one question" }`

### `POST /api/quizzes/:quizId/unpublish`

- **Access:** Quiz owner (`faculty`) or `administrator`
- **Description:** Removes a published quiz from student discovery, returning its status to `'draft'`.
- **Request:**
  - Parameters: `quizId` (MongoDB ObjectId)
- **Success Response:**
  - Status: `200 OK`
  - Body: `{ "quiz": { "id": "...", "status": "draft", ... } }`
- **Error Responses:**
  - `400 Bad Request`: `{ "error": "Invalid quiz id" }`
  - `401 Unauthorized` / `403 Forbidden`
  - `404 Not Found`: `{ "error": "Quiz not found" }`

---

## 6. Quiz Attempts, Scoring & History (Student)

All routes in this section require authentication with role `student`.

### `POST /api/quizzes/:quizId/attempts`

- **Access:** Student only (`role === 'student'`)
- **Description:** Starts a new attempt with a server-enforced deadline, or resumes an active in-progress attempt. Returns questions without answers and server timestamp for timer synchronization.
- **Request:**
  - Parameters: `quizId` (MongoDB ObjectId)
- **Success Response:**
  - Status: `201 Created` (new attempt created) or `200 OK` (resuming existing active attempt)
  - Body:
    ```json
    {
      "attempt": {
        "id": "673620000000000000000030",
        "quizId": "673620000000000000000010",
        "status": "in_progress",
        "startedAt": "2026-11-15T12:00:00.000Z",
        "deadlineAt": "2026-11-15T12:10:00.000Z",
        "answers": []
      },
      "questions": [
        {
          "id": "673620000000000000000020",
          "prompt": "Which keyword declares a block-scoped variable?",
          "options": ["var", "let", "function", "set"]
        }
      ],
      "serverTime": "2026-11-15T12:00:00.000Z"
    }
    ```
- **Error Responses:**
  - `400 Bad Request`: `{ "error": "Invalid quiz id" }`
  - `401 Unauthorized`: `{ "error": "Authentication required" }`
  - `403 Forbidden`: `{ "error": "Students only" }`
  - `404 Not Found`: `{ "error": "Quiz not found" }` (or not published)
  - `409 Conflict`: `{ "error": "You have already completed this quiz" }`

### `PATCH /api/attempts/:attemptId/answers`

- **Access:** Student owner only
- **Description:** Saves answers during an active attempt before the server deadline.
- **Request:**
  - Parameters: `attemptId` (MongoDB ObjectId)
  - Body:
    ```json
    {
      "answers": [
        {
          "questionId": "673620000000000000000020",
          "selectedOption": 1
        }
      ]
    }
    ```
- **Success Response:**
  - Status: `200 OK`
  - Body:
    ```json
    {
      "attempt": {
        "id": "673620000000000000000030",
        "quizId": "673620000000000000000010",
        "status": "in_progress",
        "startedAt": "2026-11-15T12:00:00.000Z",
        "deadlineAt": "2026-11-15T12:10:00.000Z",
        "answers": [
          {
            "questionId": "673620000000000000000020",
            "selectedOption": 1
          }
        ]
      }
    }
    ```
- **Error Responses:**
  - `400 Bad Request`: `{ "error": "Invalid attempt id" }`
  - `401 Unauthorized` / `403 Forbidden` (`{ "error": "Not your attempt" }` or `{ "error": "Students only" }`)
  - `404 Not Found`: `{ "error": "Attempt not found" }`
  - `409 Conflict`:
    - `{ "error": "This attempt has already been submitted" }`
    - `{ "error": "Time is up for this attempt" }`
    - `{ "error": "This attempt can no longer be changed" }`
  - `422 Unprocessable Entity`:
    - `{ "error": "answers must be a non-empty list" }`
    - `{ "error": "Answer refers to a question outside this quiz" }`
    - `{ "error": "selectedOption is out of range" }`

### `POST /api/attempts/:attemptId/submit`

- **Access:** Student owner only
- **Description:** Finalizes the attempt and scores it on the server against stored questions. If submitted after deadline, only answers saved before the deadline are scored. Calling submit again returns the stored result idempotently.
- **Request:**
  - Parameters: `attemptId` (MongoDB ObjectId)
  - Body: None (client-sent scores or keys are ignored)
- **Success Response:**
  - Status: `200 OK`
  - Body:
    ```json
    {
      "result": {
        "attemptId": "673620000000000000000030",
        "quizId": "673620000000000000000010",
        "status": "finalized",
        "score": 4,
        "questionCount": 5,
        "submittedAt": "2026-11-15T12:08:45.000Z"
      }
    }
    ```
- **Error Responses:**
  - `400 Bad Request`: `{ "error": "Invalid attempt id" }`
  - `401 Unauthorized`: `{ "error": "Authentication required" }`
  - `403 Forbidden`: `{ "error": "Not your attempt" }` or `{ "error": "Students only" }`
  - `404 Not Found`: `{ "error": "Attempt not found" }`

### `GET /api/attempts/:attemptId/result`

- **Access:** Student owner only
- **Description:** Returns the score and summary of a finalized attempt. Correct answers and answer keys are never exposed.
- **Request:**
  - Parameters: `attemptId` (MongoDB ObjectId)
- **Success Response:**
  - Status: `200 OK`
  - Body:
    ```json
    {
      "result": {
        "attemptId": "673620000000000000000030",
        "quizId": "673620000000000000000010",
        "status": "finalized",
        "score": 4,
        "questionCount": 5,
        "submittedAt": "2026-11-15T12:08:45.000Z"
      }
    }
    ```
- **Error Responses:**
  - `400 Bad Request`: `{ "error": "Invalid attempt id" }`
  - `401 Unauthorized`: `{ "error": "Authentication required" }`
  - `403 Forbidden`: `{ "error": "Not your attempt" }` or `{ "error": "Students only" }`
  - `404 Not Found`: `{ "error": "Attempt not found" }`
  - `409 Conflict`: `{ "error": "This attempt has not been submitted yet" }`

### `GET /api/me/scores`

- **Access:** Student only (`role === 'student'`)
- **Description:** Retrieves the authenticated student's history of finalized quiz attempts, sorted by submission date descending (most recent first). Excludes answer keys and in-progress attempts.
- **Request:**
  - Headers: `Authorization: Bearer <jwt-token>`
  - Parameters: None
  - Body: None
- **Success Response:**
  - Status: `200 OK`
  - Body:
    ```json
    {
      "scores": [
        {
          "quizTitle": "JavaScript Basics",
          "score": 4,
          "submittedAt": "2026-11-15T12:08:45.000Z"
        }
      ]
    }
    ```
- **Error Responses:**
  - `401 Unauthorized`: `{ "error": "Authentication required" }`
  - `403 Forbidden`: `{ "error": "Students only" }`

---

## 7. Quiz Leaderboards (Authenticated)

### `GET /api/quizzes/:quizId/leaderboard`

- **Access:** Authenticated users (`student`, `faculty`, `administrator`). Students can only view leaderboards for published quizzes; staff can view leaderboards for both published and draft quizzes.
- **Description:** Returns the ranked leaderboard for a quiz, ordered by highest score first, earlier submission time on ties, and attempt ID as deterministic tie-breaker. Respects student privacy by exposing only student names (no email addresses). Marks `isMe: true` for the requesting student's entry.
- **Request:**
  - Headers: `Authorization: Bearer <jwt-token>`
  - Parameters: `quizId` (MongoDB ObjectId)
  - Body: None
- **Success Response:**
  - Status: `200 OK`
  - Body:
    ```json
    {
      "quiz": {
        "id": "673620000000000000000010",
        "title": "JavaScript Basics",
        "topic": "Programming",
        "questionCount": 5
      },
      "entries": [
        {
          "rank": 1,
          "name": "Student One",
          "score": 5,
          "submittedAt": "2026-11-15T12:05:00.000Z",
          "isMe": true
        },
        {
          "rank": 2,
          "name": "Student Two",
          "score": 4,
          "submittedAt": "2026-11-15T12:06:30.000Z",
          "isMe": false
        }
      ]
    }
    ```
- **Error Responses:**
  - `400 Bad Request`: `{ "error": "Invalid quiz id" }`
  - `401 Unauthorized`: `{ "error": "Authentication required" }`
  - `404 Not Found`: `{ "error": "Quiz not found" }` (returned if quiz does not exist, or if a student requests a draft quiz)

---

## 8. User & Role Administration (Administrator)

All routes in this section require authentication with role `administrator`.

### `GET /api/admin/users`

- **Access:** Administrator only
- **Description:** Lists users and their current roles for user management. Sensitive fields (e.g. passwordHash) are omitted.
- **Success Response:**
  - Status: `200 OK`
  - Body:
    ```json
    {
      "users": [
        {
          "id": "673620000000000000000001",
          "name": "Student One",
          "email": "student1@example.com",
          "role": "student",
          "createdAt": "2026-11-01T10:00:00.000Z"
        }
      ]
    }
    ```
- **Error Responses:**
  - `401 Unauthorized`: `{ "error": "Authentication required" }`
  - `403 Forbidden`: `{ "error": "Forbidden: insufficient role" }`

### `PATCH /api/admin/users/:userId/role`

- **Access:** Administrator only
- **Description:** Promotes or demotes a user's role to `'student'`, `'faculty'`, or `'administrator'`.
- **Request:**
  - Parameters: `userId` (MongoDB ObjectId)
  - Body:
    ```json
    {
      "role": "faculty"
    }
    ```
- **Success Response:**
  - Status: `200 OK`
  - Body:
    ```json
    {
      "user": {
        "id": "673620000000000000000001",
        "name": "Student One",
        "email": "student1@example.com",
        "role": "faculty",
        "createdAt": "2026-11-01T10:00:00.000Z"
      }
    }
    ```
- **Error Responses:**
  - `400 Bad Request`: `{ "error": "Invalid user id" }`
  - `401 Unauthorized` / `403 Forbidden`
  - `404 Not Found`: `{ "error": "User not found" }`
  - `422 Unprocessable Entity`: `{ "error": "Role must be one of: student, faculty, administrator" }`

---

## 9. Feedback (Users & Administrator)

### `POST /api/feedback`

- **Access:** Authenticated user (any role: `student`, `faculty`, `administrator`)
- **Description:** Submits platform feedback with an optional star rating (1–5) and/or text comment (up to 1000 characters). At least one of rating or message must be present.
- **Request:**
  - Body:
    ```json
    {
      "rating": 5,
      "message": "The timed quizzes and feedback review work smoothly!"
    }
    ```
- **Success Response:**
  - Status: `201 Created`
  - Body:
    ```json
    {
      "feedback": {
        "id": "673620000000000000000040",
        "userId": "673620000000000000000001",
        "rating": 5,
        "message": "The timed quizzes and feedback review work smoothly!",
        "createdAt": "2026-11-15T12:30:00.000Z"
      }
    }
    ```
- **Error Responses:**
  - `401 Unauthorized`: `{ "error": "Authentication required" }`
  - `422 Unprocessable Entity`:
    - `{ "error": "At least a rating or message is required" }`
    - `{ "error": "Rating must be an integer between 1 and 5" }`
    - `{ "error": "Message must be text" }`
    - `{ "error": "Message must not exceed 1000 characters" }`

### `GET /api/admin/feedback`

- **Access:** Administrator only
- **Description:** Retrieves all submitted feedback entries with author name, email, and role populated.
- **Success Response:**
  - Status: `200 OK`
  - Body:
    ```json
    {
      "feedback": [
        {
          "id": "673620000000000000000040",
          "userId": "673620000000000000000001",
          "userName": "Student One",
          "userEmail": "student1@example.com",
          "userRole": "student",
          "rating": 5,
          "message": "The timed quizzes and feedback review work smoothly!",
          "createdAt": "2026-11-15T12:30:00.000Z"
        }
      ]
    }
    ```
- **Error Responses:**
  - `401 Unauthorized`: `{ "error": "Authentication required" }`
  - `403 Forbidden`: `{ "error": "Forbidden: insufficient role" }`

---

## 10. Route Inventory & Verification

The table below reconciles every endpoint implemented in `server/src/routes/` against this specification:

| #   | HTTP Method | Route Path                         | Access / Role                  | Route File          | Status   |
| --- | ----------- | ---------------------------------- | ------------------------------ | ------------------- | -------- |
| 1   | `GET`       | `/api/health`                      | Public                         | `health.js`         | Verified |
| 2   | `POST`      | `/api/auth/register`               | Public                         | `auth.js`           | Verified |
| 3   | `POST`      | `/api/auth/login`                  | Public                         | `auth.js`           | Verified |
| 4   | `POST`      | `/api/auth/logout`                 | Authenticated                  | `auth.js`           | Verified |
| 5   | `GET`       | `/api/roles/me`                    | Authenticated                  | `roles.js`          | Verified |
| 6   | `GET`       | `/api/roles/quiz-management`       | Faculty, Administrator         | `roles.js`          | Verified |
| 7   | `GET`       | `/api/roles/administration`        | Administrator                  | `roles.js`          | Verified |
| 8   | `GET`       | `/api/quizzes`                     | Public                         | `quizzes.js`        | Verified |
| 9   | `GET`       | `/api/quizzes/:quizId`             | Public                         | `quizzes.js`        | Verified |
| 10  | `GET`       | `/api/manage/quizzes`              | Faculty, Administrator         | `quizAuthoring.js`  | Verified |
| 11  | `GET`       | `/api/manage/quizzes/:quizId`      | Faculty (owner), Administrator | `quizAuthoring.js`  | Verified |
| 12  | `POST`      | `/api/quizzes`                     | Faculty, Administrator         | `quizAuthoring.js`  | Verified |
| 13  | `PATCH`     | `/api/quizzes/:quizId`             | Faculty (owner), Administrator | `quizAuthoring.js`  | Verified |
| 14  | `DELETE`    | `/api/quizzes/:quizId`             | Faculty (owner), Administrator | `quizAuthoring.js`  | Verified |
| 15  | `POST`      | `/api/quizzes/:quizId/publish`     | Faculty (owner), Administrator | `quizAuthoring.js`  | Verified |
| 16  | `POST`      | `/api/quizzes/:quizId/unpublish`   | Faculty (owner), Administrator | `quizAuthoring.js`  | Verified |
| 17  | `POST`      | `/api/quizzes/:quizId/attempts`    | Student                        | `attempts.js`       | Verified |
| 18  | `PATCH`     | `/api/attempts/:attemptId/answers` | Student (attempt owner)        | `attempts.js`       | Verified |
| 19  | `POST`      | `/api/attempts/:attemptId/submit`  | Student (attempt owner)        | `attempts.js`       | Verified |
| 20  | `GET`       | `/api/attempts/:attemptId/result`  | Student (attempt owner)        | `attempts.js`       | Verified |
| 21  | `GET`       | `/api/me/scores`                   | Student                        | `attempts.js`       | Verified |
| 22  | `GET`       | `/api/quizzes/:quizId/leaderboard` | Authenticated                  | `leaderboard.js`    | Verified |
| 23  | `GET`       | `/api/admin/users`                 | Administrator                  | `userManagement.js` | Verified |
| 24  | `PATCH`     | `/api/admin/users/:userId/role`    | Administrator                  | `userManagement.js` | Verified |
| 25  | `POST`      | `/api/feedback`                    | Authenticated                  | `feedback.js`       | Verified |
| 26  | `GET`       | `/api/admin/feedback`              | Administrator                  | `feedback.js`       | Verified |

Total implemented endpoints: **26**. Total documented endpoints: **26** (100% coverage).
