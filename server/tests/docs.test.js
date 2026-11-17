import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(__filename), '../..');

describe('Documentation and Clean-Machine Onboarding (NFR-006)', () => {
  it('TC-UX-03 verifies clean-machine onboarding instructions, environment templates, and complete API documentation', () => {
    // 1. README.md exists and covers onboarding steps
    const readmePath = path.join(rootDir, 'README.md');
    expect(fs.existsSync(readmePath)).toBe(true);
    const readmeContent = fs.readFileSync(readmePath, 'utf8');

    // Prerequisites
    expect(readmeContent).toMatch(/Node\.js.*22/i);
    expect(readmeContent).toMatch(/npm/i);
    expect(readmeContent).toMatch(/MongoDB/i);

    // Setup & run commands
    expect(readmeContent).toContain('npm install');
    expect(readmeContent).toContain('server/.env.example');
    expect(readmeContent).toContain('npm run seed');
    expect(readmeContent).toContain('npm run dev:server');
    expect(readmeContent).toContain('npm run dev:client');

    // Quality check and test commands
    expect(readmeContent).toContain('npm test');
    expect(readmeContent).toContain('npm run lint');
    expect(readmeContent).toContain('npm run format:check');
    expect(readmeContent).toContain('npm run build');

    // Links to documentation
    expect(readmeContent).toContain('[docs/API.md](docs/API.md)');
    expect(readmeContent).toContain('[docs/DEVIATIONS.md](docs/DEVIATIONS.md)');

    // Seed accounts and local URLs
    expect(readmeContent).toContain('admin@example.com');
    expect(readmeContent).toContain('faculty1@example.com');
    expect(readmeContent).toContain('student1@example.com');
    expect(readmeContent).toContain('http://localhost:5173');
    expect(readmeContent).toContain('http://localhost:5050/api');
    expect(readmeContent).toContain('http://localhost:5050/api/health');

    // 2. Environment example files exist and have required keys
    const serverEnvExamplePath = path.join(rootDir, 'server', '.env.example');
    expect(fs.existsSync(serverEnvExamplePath)).toBe(true);
    const serverEnvContent = fs.readFileSync(serverEnvExamplePath, 'utf8');
    expect(serverEnvContent).toContain('PORT=');
    expect(serverEnvContent).toContain('MONGODB_URI=');
    expect(serverEnvContent).toContain('JWT_SECRET=');
    expect(serverEnvContent).toContain('CLIENT_ORIGIN=');
    expect(serverEnvContent).toContain('SEED_PASSWORD=');

    const clientEnvExamplePath = path.join(rootDir, 'client', '.env.example');
    expect(fs.existsSync(clientEnvExamplePath)).toBe(true);
    const clientEnvContent = fs.readFileSync(clientEnvExamplePath, 'utf8');
    expect(clientEnvContent).toContain('VITE_API_URL=');

    // 3. docs/DEVIATIONS.md exists and documents submitted spec comparisons
    const deviationsPath = path.join(rootDir, 'docs', 'DEVIATIONS.md');
    expect(fs.existsSync(deviationsPath)).toBe(true);
    const deviationsContent = fs.readFileSync(deviationsPath, 'utf8');
    expect(deviationsContent).toContain('Online_Quiz_System_SRS_Revised.docx');
    expect(deviationsContent).toContain('Online_Quiz_System_SAD_Revised.docx');
    expect(deviationsContent).toContain('Online_Quiz_System_STP_Revised-2.docx');
    expect(deviationsContent).toContain('OQS-07');
    expect(deviationsContent).toContain('OQS-15');
    expect(deviationsContent).toContain('OQS-17');

    // 4. docs/API.md exists and covers all 26 mounted Express endpoints
    const apiDocPath = path.join(rootDir, 'docs', 'API.md');
    expect(fs.existsSync(apiDocPath)).toBe(true);
    const apiDocContent = fs.readFileSync(apiDocPath, 'utf8');

    const expectedEndpoints = [
      'GET /api/health',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'POST /api/auth/logout',
      'GET /api/roles/me',
      'GET /api/roles/quiz-management',
      'GET /api/roles/administration',
      'GET /api/quizzes',
      'GET /api/quizzes/:quizId',
      'POST /api/quizzes/:quizId/attempts',
      'PATCH /api/attempts/:attemptId/answers',
      'POST /api/attempts/:attemptId/submit',
      'GET /api/attempts/:attemptId/result',
      'GET /api/me/scores',
      'GET /api/quizzes/:quizId/leaderboard',
      'GET /api/manage/quizzes',
      'GET /api/manage/quizzes/:quizId',
      'POST /api/quizzes',
      'PATCH /api/quizzes/:quizId',
      'DELETE /api/quizzes/:quizId',
      'POST /api/quizzes/:quizId/publish',
      'POST /api/quizzes/:quizId/unpublish',
      'GET /api/admin/users',
      'PATCH /api/admin/users/:userId/role',
      'POST /api/feedback',
      'GET /api/admin/feedback',
    ];

    expect(expectedEndpoints).toHaveLength(26);

    for (const endpoint of expectedEndpoints) {
      const documented =
        apiDocContent.includes(`### \`${endpoint}\``) ||
        apiDocContent.includes(`\`${endpoint}\``) ||
        apiDocContent.includes(endpoint);
      expect(documented, `Missing documentation for endpoint: ${endpoint}`).toBe(true);
    }

    expect(apiDocContent).toContain('Total implemented endpoints: **26**');
    expect(apiDocContent).toContain('Total documented endpoints: **26**');
  });
});
