import bcrypt from 'bcryptjs';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import User from '../src/models/User.js';
import { getSeedUserDefinitions, runSeed, seedUsers } from '../src/scripts/seed.js';
import { clearTestDB, closeTestDB, connectTestDB } from './helpers/db.js';

describe('Database seed script', () => {
  beforeAll(connectTestDB);
  afterEach(clearTestDB);
  afterAll(closeTestDB);

  it('generates definitions for 1 administrator, 2 faculty, and 5 students using env vars', () => {
    const customEnv = {
      SEED_PASSWORD: 'GlobalPassword123!',
      SEED_ADMIN_PASSWORD: 'AdminSpecial123!',
    };

    const definitions = getSeedUserDefinitions(customEnv);

    expect(definitions).toHaveLength(8);

    const admins = definitions.filter((u) => u.role === 'administrator');
    const faculty = definitions.filter((u) => u.role === 'faculty');
    const students = definitions.filter((u) => u.role === 'student');

    expect(admins).toHaveLength(1);
    expect(admins[0].password).toBe('AdminSpecial123!');
    expect(admins[0].email).toBe('admin@example.com');

    expect(faculty).toHaveLength(2);
    expect(faculty[0].password).toBe('GlobalPassword123!');
    expect(faculty[1].password).toBe('GlobalPassword123!');

    expect(students).toHaveLength(5);
    expect(students.every((s) => s.password === 'GlobalPassword123!')).toBe(true);
  });

  it('seeds users with hashed passwords and correct roles into the database', async () => {
    const env = { SEED_PASSWORD: 'SecretPassword999!' };
    const seeded = await seedUsers(env);

    expect(seeded).toHaveLength(8);

    const totalInDb = await User.countDocuments();
    expect(totalInDb).toBe(8);

    const admin = await User.findOne({ email: 'admin@example.com' }).select('+passwordHash');
    expect(admin).not.toBeNull();
    expect(admin.role).toBe('administrator');
    expect(await bcrypt.compare('SecretPassword999!', admin.passwordHash)).toBe(true);

    const faculty = await User.find({ role: 'faculty' });
    expect(faculty).toHaveLength(2);

    const students = await User.find({ role: 'student' });
    expect(students).toHaveLength(5);
  });

  it('is idempotent when run repeatedly', async () => {
    const env = { SEED_PASSWORD: 'InitialPassword123!' };
    await seedUsers(env);

    const secondEnv = { SEED_PASSWORD: 'UpdatedPassword123!' };
    const secondRun = await seedUsers(secondEnv);

    expect(secondRun).toHaveLength(8);
    const count = await User.countDocuments();
    expect(count).toBe(8);

    const admin = await User.findOne({ email: 'admin@example.com' }).select('+passwordHash');
    expect(await bcrypt.compare('UpdatedPassword123!', admin.passwordHash)).toBe(true);
  });

  it('runSeed rejects when no mongodb uri is provided', async () => {
    await expect(runSeed('')).rejects.toThrow('MONGODB_URI is required to run the seed script.');
  });
});
